import { db } from "@/lib/db";
import { Prisma, type PromoRole } from "@/generated/prisma/client";
import { planGroupDeparture } from "@/lib/group-departure";
import { generatePromoCode, isPromoCodeFormat } from "@/lib/promo-code";
import { releaseAssignments } from "@/lib/services/departure";
import type { LeavePromoInput } from "@/lib/validation/promo";

// Promotions (§4.2). Chaque fonction reçoit l'utilisateur courant (issu de la
// session, jamais du formulaire) et vérifie ses droits à chaque appel (§8).
// Les entrées ont déjà été validées par Zod dans les actions.

/** Utilisateur courant, tel que renvoyé par requireVerifiedUser(). */
export type Actor = { id: string; emailVerifiedAt: Date | null };

export type Tx = Prisma.TransactionClient;

export type PromoError =
  | "unverified"
  | "already_in_promo"
  | "invalid_code"
  | "not_member"
  | "not_delegate"
  | "delegate_alone"
  | "delegate_successor_required"
  | "invalid_successor"
  | "leader_successor_required"
  | "code_generation_failed"
  | "conflict";

export type PromoFailure = {
  ok: false;
  error: PromoError;
  /** Groupes dont le successeur manque (leader_successor_required). */
  groups?: { id: string; name: string }[];
};

export const PROMO_ERROR_MESSAGES: Record<PromoError, string> = {
  unverified: "Validez votre adresse email avant de continuer.",
  already_in_promo: "Vous êtes déjà dans une promo. Quittez-la avant d'en créer ou d'en rejoindre une autre.",
  // Message générique : ne dit pas si le code a existé.
  invalid_code: "Code invalide.",
  not_member: "Promo introuvable.",
  not_delegate: "Seul le délégué peut effectuer cette action.",
  delegate_alone: "Vous êtes le seul membre de la promo : supprimez-la au lieu de la quitter.",
  delegate_successor_required: "Nommez un successeur parmi les membres avant de quitter la promo.",
  invalid_successor: "Le successeur doit être un autre membre de la promo.",
  leader_successor_required: "Nommez un successeur dans chacun des groupes que vous dirigez.",
  code_generation_failed: "La création a échoué. Réessayez.",
  conflict: "La promo a changé pendant l'opération. Rechargez la page et réessayez.",
};

const fail = (error: PromoError): PromoFailure => ({ ok: false, error });

const isVerified = (actor: Actor) => actor.emailVerifiedAt !== null;

export function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/**
 * Verrouille la ligne de la promo jusqu'à la fin de la transaction : les
 * opérations sur une même promo (rejoindre, quitter, passation, suppression)
 * s'exécutent l'une après l'autre. `false` si la promo n'existe plus.
 * Les opérations de groupe le prennent aussi, avant le verrou du groupe :
 * même ordre que leavePromo et deletePromo, donc pas d'interblocage.
 */
export async function lockPromo(tx: Tx, promoId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM promos WHERE id = ${promoId}::uuid FOR UPDATE`;
  return rows.length > 0;
}

/** Une transaction interrompue par une écriture concurrente devient « conflict ». */
async function inTransaction<T>(fn: (tx: Tx) => Promise<T | PromoFailure>): Promise<T | PromoFailure> {
  try {
    return await db.$transaction(fn);
  } catch (error) {
    if (isPrismaError(error, "P2025") || isPrismaError(error, "P2003")) return fail("conflict");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Lecture

/** Promo de l'utilisateur, ou null. */
export async function findMyPromoId(actor: Actor): Promise<string | null> {
  if (!isVerified(actor)) return null;
  const me = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  return me?.promoId ?? null;
}

type Person = { id: string; username: string; firstName: string; lastName: string };

export type PromoOverview = {
  id: string;
  name: string;
  /** Visible du délégué uniquement (§6.3). */
  code: string | null;
  myRole: PromoRole;
  members: (Person & { role: PromoRole })[];
  groups: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    memberCount: number;
    isMember: boolean;
  }[];
  /** Ce qu'il faut fournir pour quitter la promo. */
  leave: {
    /** Groupes dirigés qui ont d'autres membres : successeur obligatoire. */
    ledGroups: { id: string; name: string; candidates: Person[] }[];
    /** Groupes dont l'utilisateur est le seul membre : supprimés à son départ. */
    soloGroups: { id: string; name: string }[];
  };
};

const PERSON = { id: true, username: true, firstName: true, lastName: true } as const;

const byName = (a: Person, b: Person) =>
  a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr");

/**
 * Vue de la promo pour un membre. Null pour un non-membre : il ne voit ni le
 * nom, ni les membres, ni les groupes, ni le code.
 */
export async function getPromoOverview(actor: Actor, promoId: string): Promise<PromoOverview | null> {
  if (!isVerified(actor)) return null;
  const me = await db.promoMember.findUnique({
    where: { userId: actor.id },
    select: { promoId: true, role: true },
  });
  if (!me || me.promoId !== promoId) return null;

  const promo = await db.promo.findUnique({
    where: { id: promoId },
    select: {
      id: true,
      name: true,
      code: true,
      members: { select: { role: true, user: { select: PERSON } } },
      groups: {
        orderBy: [{ endDate: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          members: { select: { role: true, user: { select: PERSON } } },
        },
      },
    },
  });
  if (!promo) return null;

  const members = promo.members
    .map((m) => ({ ...m.user, role: m.role }))
    .sort((a, b) => (a.role === b.role ? byName(a, b) : a.role === "delegate" ? -1 : 1));

  const ledGroups: PromoOverview["leave"]["ledGroups"] = [];
  const soloGroups: PromoOverview["leave"]["soloGroups"] = [];
  for (const g of promo.groups) {
    const mine = g.members.find((m) => m.user.id === actor.id);
    if (!mine) continue;
    const others = g.members.filter((m) => m.user.id !== actor.id).map((m) => m.user);
    if (others.length === 0) soloGroups.push({ id: g.id, name: g.name });
    else if (mine.role === "leader") ledGroups.push({ id: g.id, name: g.name, candidates: others.sort(byName) });
  }

  return {
    id: promo.id,
    name: promo.name,
    code: me.role === "delegate" ? promo.code : null,
    myRole: me.role,
    members,
    groups: promo.groups.map((g) => ({
      id: g.id,
      name: g.name,
      startDate: g.startDate,
      endDate: g.endDate,
      memberCount: g.members.length,
      isMember: g.members.some((m) => m.user.id === actor.id),
    })),
    leave: { ledGroups, soloGroups },
  };
}

// ---------------------------------------------------------------------------
// Création et adhésion

const MAX_CODE_ATTEMPTS = 5;

/** Crée la promo ; l'utilisateur en devient le délégué (§4.2). */
export async function createPromo(
  actor: Actor,
  input: { name: string },
): Promise<{ ok: true; promoId: string; code: string } | PromoFailure> {
  if (!isVerified(actor)) return fail("unverified");
  const existing = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { userId: true } });
  if (existing) return fail("already_in_promo");

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generatePromoCode();
    try {
      // Écriture imbriquée : promo et délégué sont créés ensemble ou pas du tout.
      const promo = await db.promo.create({
        data: {
          name: input.name,
          code,
          createdById: actor.id,
          members: { create: { userId: actor.id, role: "delegate" } },
        },
        select: { id: true, code: true },
      });
      return { ok: true, promoId: promo.id, code: promo.code };
    } catch (error) {
      if (!isPrismaError(error, "P2002")) throw error;
      // Contrainte unique : soit promo_members.user_id (adhésion concurrente,
      // garantie finale), soit promos.code (collision : on régénère).
      const joined = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { userId: true } });
      if (joined) return fail("already_in_promo");
    }
  }
  return fail("code_generation_failed");
}

/** Rejoindre par code uniquement (§4.2). `code` est déjà normalisé. */
export async function joinPromo(
  actor: Actor,
  input: { code: string },
): Promise<{ ok: true; promoId: string } | PromoFailure> {
  if (!isVerified(actor)) return fail("unverified");
  const existing = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { userId: true } });
  if (existing) return fail("already_in_promo");
  if (!isPromoCodeFormat(input.code)) return fail("invalid_code");

  const promo = await db.promo.findUnique({ where: { code: input.code }, select: { id: true } });
  if (!promo) return fail("invalid_code");

  try {
    return await db.$transaction(async (tx) => {
      // Promo supprimée entre-temps : même message qu'un code inconnu.
      if (!(await lockPromo(tx, promo.id))) return fail("invalid_code");
      await tx.promoMember.create({ data: { promoId: promo.id, userId: actor.id, role: "member" } });
      return { ok: true as const, promoId: promo.id };
    });
  } catch (error) {
    // Unicité de promo_members.user_id : garantie finale contre deux adhésions.
    if (isPrismaError(error, "P2002")) return fail("already_in_promo");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Départ

/**
 * Quitter la promo (§4.2), en une seule transaction :
 * - délégué : successeur obligatoire, membre de la promo, qui devient délégué ;
 * - chef de groupe : successeur obligatoire dans chacun de ses groupes (décision 8) ;
 * - dans chaque groupe de la promo, départ selon §4.4 : ses assignations sont
 *   retirées, ses tâches dont il était seul assigné deviennent non assignées ;
 * - un groupe dont il est le seul membre est supprimé (§4.3, groupe sans membre).
 */
export async function leavePromo(
  actor: Actor,
  input: LeavePromoInput,
): Promise<{ ok: true } | PromoFailure> {
  if (!isVerified(actor)) return fail("unverified");
  const first = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  if (!first) return fail("not_member");
  const promoId = first.promoId;

  return inTransaction(async (tx) => {
    if (!(await lockPromo(tx, promoId))) return fail("not_member");
    // Relu après le verrou : le rôle a pu changer (passation concurrente).
    const me = await tx.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true, role: true } });
    if (!me || me.promoId !== promoId) return fail("not_member");

    let delegateSuccessorId: string | null = null;
    if (me.role === "delegate") {
      const others = await tx.promoMember.count({ where: { promoId, userId: { not: actor.id } } });
      if (others === 0) return fail("delegate_alone");
      if (!input.successorId) return fail("delegate_successor_required");
      if (!(await isOtherMember(tx, promoId, actor.id, input.successorId))) return fail("invalid_successor");
      delegateSuccessorId = input.successorId;
    }

    const memberships = await tx.groupMember.findMany({
      where: { userId: actor.id, group: { promoId } },
      select: {
        groupId: true,
        role: true,
        group: { select: { name: true, members: { where: { userId: { not: actor.id } }, select: { userId: true } } } },
      },
    });

    // Mêmes règles que le départ d'un groupe (lib/group-departure.ts).
    const missing: { id: string; name: string }[] = [];
    const leaderSuccessors: { groupId: string; userId: string }[] = [];
    const soloGroupIds: string[] = [];
    const keptGroupIds: string[] = [];
    for (const m of memberships) {
      const plan = planGroupDeparture({
        leaverId: actor.id,
        leaverRole: m.role,
        memberIds: [actor.id, ...m.group.members.map((u) => u.userId)],
        successorId: input.groupSuccessors[m.groupId],
      });
      if (!plan.ok) missing.push({ id: m.groupId, name: m.group.name });
      else if (plan.kind === "delete_group") soloGroupIds.push(m.groupId);
      else {
        keptGroupIds.push(m.groupId);
        if (plan.newLeaderId) leaderSuccessors.push({ groupId: m.groupId, userId: plan.newLeaderId });
      }
    }
    if (missing.length > 0) return { ok: false, error: "leader_successor_required", groups: missing };

    // §4.4 : une tâche partagée reste aux autres ; une tâche dont il était seul
    // assigné devient non assignée ; plus de réunion sans plusieurs assignés.
    await releaseAssignments(tx, actor.id, keptGroupIds);

    // Départ des groupes, puis passation (un seul chef par groupe).
    await tx.groupMember.deleteMany({ where: { userId: actor.id, groupId: { in: keptGroupIds } } });
    for (const s of leaderSuccessors) {
      await tx.groupMember.update({
        where: { groupId_userId: { groupId: s.groupId, userId: s.userId } },
        data: { role: "leader" },
      });
    }
    // Groupes dont il était le seul membre : supprimés avec leurs données.
    await tx.group.deleteMany({ where: { id: { in: soloGroupIds }, promoId } });
    // Invitations en attente vers les groupes de cette promo : sans objet.
    await tx.groupInvitation.deleteMany({
      where: { invitedUserId: actor.id, status: "pending", group: { promoId } },
    });

    // Départ de la promo, puis passation (un seul délégué par promo).
    await tx.promoMember.delete({ where: { userId: actor.id } });
    if (delegateSuccessorId) {
      await tx.promoMember.update({ where: { userId: delegateSuccessorId }, data: { role: "delegate" } });
    }
    return { ok: true as const };
  });
}

async function isOtherMember(tx: Tx, promoId: string, selfId: string, userId: string): Promise<boolean> {
  if (userId === selfId) return false;
  const m = await tx.promoMember.findUnique({ where: { userId }, select: { promoId: true } });
  return m?.promoId === promoId;
}

// ---------------------------------------------------------------------------
// Gestion par le délégué

/** Vérifie, sous verrou, que l'utilisateur est le délégué de cette promo. */
async function requireDelegate(tx: Tx, actor: Actor, promoId: string): Promise<PromoFailure | null> {
  if (!(await lockPromo(tx, promoId))) return fail("not_member");
  const me = await tx.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true, role: true } });
  if (!me || me.promoId !== promoId) return fail("not_member");
  if (me.role !== "delegate") return fail("not_delegate");
  return null;
}

/** Passation (§4.2) : le membre choisi reçoit le rôle immédiatement. */
export async function transferDelegation(
  actor: Actor,
  input: { promoId: string; successorId: string },
): Promise<{ ok: true } | PromoFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inTransaction(async (tx) => {
    const denied = await requireDelegate(tx, actor, input.promoId);
    if (denied) return denied;
    if (!(await isOtherMember(tx, input.promoId, actor.id, input.successorId))) return fail("invalid_successor");
    await tx.promoMember.update({ where: { userId: actor.id }, data: { role: "member" } });
    await tx.promoMember.update({ where: { userId: input.successorId }, data: { role: "delegate" } });
    return { ok: true as const };
  });
}

/**
 * Suppression (§4.2, décision 7), en une seule transaction : tous les membres
 * quittent la promo, tous ses groupes sont supprimés avec leurs tâches,
 * assignations, dépendances, invitations et réunions (cascade).
 */
export async function deletePromo(actor: Actor, input: { promoId: string }): Promise<{ ok: true } | PromoFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inTransaction(async (tx) => {
    const denied = await requireDelegate(tx, actor, input.promoId);
    if (denied) return denied;
    await tx.group.deleteMany({ where: { promoId: input.promoId } });
    await tx.promoMember.deleteMany({ where: { promoId: input.promoId } });
    await tx.promo.delete({ where: { id: input.promoId } });
    return { ok: true as const };
  });
}
