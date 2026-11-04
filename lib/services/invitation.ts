import { db } from "@/lib/db";
import { inGroupTransaction, isUuid, isVerified, lockGroup, requireGroupRole } from "@/lib/services/group";
import type { Actor } from "@/lib/services/promo";
import type { InviteInput, RespondInvitationInput } from "@/lib/validation/group";

// Invitations dans un groupe (§4.3) : le chef invite un membre de la même
// promo par son nom d'utilisateur ; seul l'invité accepte ou refuse. On ne
// rejoint un groupe qu'après acceptation.

export type InvitationError =
  | "unverified"
  | "not_found"
  | "not_leader"
  | "user_not_in_promo"
  | "already_member"
  | "already_invited"
  | "invitation_not_found"
  | "conflict";

export type InvitationFailure = { ok: false; error: InvitationError };

export const INVITATION_ERROR_MESSAGES: Record<InvitationError, string> = {
  unverified: "Validez votre adresse email avant de continuer.",
  not_found: "Groupe introuvable.",
  not_leader: "Seul le chef du groupe peut inviter.",
  // Même message pour un nom inconnu et un étudiant d'une autre promo.
  user_not_in_promo: "Aucun membre de votre promo n'a ce nom d'utilisateur.",
  already_member: "Cet étudiant est déjà membre du groupe.",
  already_invited: "Une invitation est déjà en attente pour cet étudiant.",
  invitation_not_found: "Cette invitation n'est plus valable.",
  conflict: "Le groupe a changé pendant l'opération. Rechargez la page et réessayez.",
};

const fail = (error: InvitationError): InvitationFailure => ({ ok: false, error });

/**
 * Invitation par nom d'utilisateur (déjà normalisé) : chef uniquement, invité
 * membre de la même promo, pas déjà membre, une seule invitation en attente.
 */
export async function inviteToGroup(
  actor: Actor,
  input: InviteInput,
): Promise<{ ok: true; invitationId: string } | InvitationFailure> {
  if (!isVerified(actor)) return fail("unverified");
  // Index unique partiel (une invitation en attente) : garantie finale en cas
  // de demandes concurrentes, traduite en « already_invited ».
  return inGroupTransaction(
    async (tx) => {
      const access = await requireGroupRole(tx, actor, input.groupId, "leader");
      if (!access.ok) return fail(access.error === "not_leader" ? "not_leader" : "not_found");

      const invited = await tx.user.findUnique({
        where: { username: input.username },
        select: { id: true, promoMembership: { select: { promoId: true } } },
      });
      if (!invited || invited.promoMembership?.promoId !== access.promoId) return fail("user_not_in_promo");

      const member = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId: invited.id } },
        select: { userId: true },
      });
      if (member) return fail("already_member");

      const pending = await tx.groupInvitation.findFirst({
        where: { groupId: input.groupId, invitedUserId: invited.id, status: "pending" },
        select: { id: true },
      });
      if (pending) return fail("already_invited");

      const invitation = await tx.groupInvitation.create({
        data: { groupId: input.groupId, invitedUserId: invited.id },
        select: { id: true },
      });
      return { ok: true as const, invitationId: invitation.id };
    },
    fail("conflict"),
    fail("already_invited"),
  );
}

/**
 * Réponse de l'invité, et de lui seul. Accepter le fait entrer dans le groupe
 * comme membre ; refuser ne change rien d'autre que l'invitation.
 */
export async function respondToInvitation(
  actor: Actor,
  input: RespondInvitationInput,
): Promise<{ ok: true; groupId: string; joined: boolean } | InvitationFailure> {
  if (!isVerified(actor)) return fail("unverified");
  if (!isUuid(input.invitationId)) return fail("invitation_not_found");
  const first = await db.groupInvitation.findUnique({
    where: { id: input.invitationId },
    select: { groupId: true, invitedUserId: true },
  });
  // Invitation d'un autre utilisateur : même réponse qu'une invitation inconnue.
  if (!first || first.invitedUserId !== actor.id) return fail("invitation_not_found");

  return inGroupTransaction(async (tx) => {
    const locked = await lockGroup(tx, first.groupId);
    if (!locked) return fail("invitation_not_found");
    const invitation = await tx.groupInvitation.findUnique({
      where: { id: input.invitationId },
      select: { status: true, invitedUserId: true },
    });
    if (!invitation || invitation.invitedUserId !== actor.id || invitation.status !== "pending") {
      return fail("invitation_not_found");
    }

    if (input.decision === "decline") {
      await tx.groupInvitation.update({ where: { id: input.invitationId }, data: { status: "declined" } });
      return { ok: true as const, groupId: first.groupId, joined: false };
    }

    // L'invité doit encore être dans la promo du groupe.
    const me = await tx.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
    if (me?.promoId !== locked.promoId) {
      await tx.groupInvitation.delete({ where: { id: input.invitationId } });
      return fail("invitation_not_found");
    }
    const already = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId: first.groupId, userId: actor.id } },
      select: { userId: true },
    });
    if (!already) {
      await tx.groupMember.create({ data: { groupId: first.groupId, userId: actor.id, role: "member" } });
    }
    await tx.groupInvitation.update({ where: { id: input.invitationId }, data: { status: "accepted" } });
    return { ok: true as const, groupId: first.groupId, joined: true };
  }, fail("conflict"));
}

/**
 * Annulation par le chef du groupe, et par lui seul, d'une invitation encore
 * en attente. L'invitation est supprimée : l'invité ne la voit plus. Un
 * non-membre du groupe reçoit « not_found » ; une invitation déjà acceptée ou
 * refusée n'est pas annulable.
 */
export async function cancelInvitation(
  actor: Actor,
  input: { invitationId: string },
): Promise<{ ok: true; groupId: string } | InvitationFailure> {
  if (!isVerified(actor)) return fail("unverified");
  if (!isUuid(input.invitationId)) return fail("invitation_not_found");
  const first = await db.groupInvitation.findUnique({ where: { id: input.invitationId }, select: { groupId: true } });
  if (!first) return fail("invitation_not_found");

  return inGroupTransaction(async (tx) => {
    // Droits vérifiés sur le groupe de l'invitation, jamais sur un identifiant du formulaire.
    const access = await requireGroupRole(tx, actor, first.groupId, "leader");
    if (!access.ok) return fail(access.error === "not_leader" ? "not_leader" : "not_found");
    const invitation = await tx.groupInvitation.findUnique({
      where: { id: input.invitationId },
      select: { groupId: true, status: true },
    });
    if (!invitation || invitation.groupId !== first.groupId || invitation.status !== "pending") {
      return fail("invitation_not_found");
    }
    await tx.groupInvitation.delete({ where: { id: input.invitationId } });
    return { ok: true as const, groupId: first.groupId };
  }, fail("conflict"));
}

export type PendingInvitation = {
  id: string;
  group: { id: string; name: string; startDate: Date; endDate: Date };
  leader: { firstName: string; lastName: string; username: string } | null;
  createdAt: Date;
};

/** Invitations en attente de l'utilisateur, pour les groupes de sa promo. */
export async function listMyPendingInvitations(actor: Actor): Promise<PendingInvitation[]> {
  if (!isVerified(actor)) return [];
  const me = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  if (!me) return [];
  const rows = await db.groupInvitation.findMany({
    where: { invitedUserId: actor.id, status: "pending", group: { promoId: me.promoId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      group: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          members: {
            where: { role: "leader" },
            select: { user: { select: { firstName: true, lastName: true, username: true } } },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    group: { id: r.group.id, name: r.group.name, startDate: r.group.startDate, endDate: r.group.endDate },
    leader: r.group.members[0]?.user ?? null,
  }));
}
