import { db } from "@/lib/db";
import type { GroupRole } from "@/generated/prisma/client";
import { isValidSuccessor, planGroupDeparture } from "@/lib/group-departure";
import { releaseAssignments } from "@/lib/services/departure";
import { isPrismaError, lockPromo, type Actor, type Tx } from "@/lib/services/promo";
import type { CreateGroupInput, LeaveGroupInput, UpdateGroupInput } from "@/lib/validation/group";

// Groupes (§4.3) et départs (§4.4). Chaque fonction reçoit l'utilisateur
// courant (issu de la session) et revérifie ses droits sur le groupe visé à
// chaque appel, y compris quand l'identifiant vient de l'URL (§8). Un
// non-membre, même de la même promo, reçoit « not_found » : il n'apprend rien
// du groupe.

export type GroupError =
  | "unverified"
  | "no_promo"
  | "not_found"
  | "not_leader"
  | "invalid_dates"
  | "leader_successor_required"
  | "invalid_successor"
  | "conflict";

export type GroupFailure = { ok: false; error: GroupError };

export const GROUP_ERROR_MESSAGES: Record<GroupError, string> = {
  unverified: "Validez votre adresse email avant de continuer.",
  no_promo: "Rejoignez une promo avant de créer un groupe.",
  not_found: "Groupe introuvable.",
  not_leader: "Seul le chef du groupe peut effectuer cette action.",
  invalid_dates: "La date de fin doit être égale ou postérieure à la date de début.",
  leader_successor_required: "Nommez un successeur parmi les membres avant de quitter le groupe.",
  invalid_successor: "Le successeur doit être un autre membre du groupe.",
  conflict: "Le groupe a changé pendant l'opération. Rechargez la page et réessayez.",
};

const fail = (error: GroupError): GroupFailure => ({ ok: false, error });

export const isVerified = (actor: Actor) => actor.emailVerifiedAt !== null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Un identifiant lu dans l'URL n'est pas validé par Zod : on le filtre ici. */
export const isUuid = (value: string) => UUID_RE.test(value);

/**
 * Une transaction interrompue par une écriture concurrente devient `conflict`
 * (ou `duplicate` pour une contrainte d'unicité, si fourni).
 */
export async function inGroupTransaction<T, F extends { ok: false }>(
  fn: (tx: Tx) => Promise<T | F>,
  conflict: F,
  duplicate: F = conflict,
): Promise<T | F> {
  try {
    return await db.$transaction(fn);
  } catch (error) {
    if (isPrismaError(error, "P2002")) return duplicate;
    if (isPrismaError(error, "P2025") || isPrismaError(error, "P2003")) return conflict;
    throw error;
  }
}

/**
 * Verrouille la promo puis le groupe jusqu'à la fin de la transaction (même
 * ordre que leavePromo et deletePromo). Null si le groupe n'existe plus.
 */
export async function lockGroup(tx: Tx, groupId: string): Promise<{ promoId: string } | null> {
  if (!isUuid(groupId)) return null;
  const group = await tx.group.findUnique({ where: { id: groupId }, select: { promoId: true } });
  if (!group || !(await lockPromo(tx, group.promoId))) return null;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM groups WHERE id = ${groupId}::uuid FOR UPDATE`;
  return rows.length > 0 ? { promoId: group.promoId } : null;
}

/**
 * Sous verrou : l'utilisateur est membre du groupe (et, si `leader`, en est
 * le chef). Un non-membre reçoit « not_found ».
 */
export async function requireGroupRole(
  tx: Tx,
  actor: Actor,
  groupId: string,
  needed: "member" | "leader",
): Promise<{ ok: true; promoId: string; role: GroupRole } | GroupFailure> {
  const locked = await lockGroup(tx, groupId);
  if (!locked) return fail("not_found");
  const me = await tx.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: actor.id } },
    select: { role: true },
  });
  if (!me) return fail("not_found");
  if (needed === "leader" && me.role !== "leader") return fail("not_leader");
  return { ok: true, promoId: locked.promoId, role: me.role };
}

// ---------------------------------------------------------------------------
// Lecture

type Person = { id: string; username: string; firstName: string; lastName: string };
const PERSON = { id: true, username: true, firstName: true, lastName: true } as const;

const byName = (a: Person, b: Person) =>
  a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr");

export type GroupView = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  marginPercent: number;
  myRole: GroupRole;
  /** Chef en premier, puis ordre alphabétique. */
  members: (Person & { role: GroupRole })[];
  pendingInvitations: { id: string; user: Person; createdAt: Date }[];
  taskCount: number;
  unassignedTaskCount: number;
};

/** Vue du groupe pour l'un de ses membres ; null pour tout autre utilisateur. */
export async function getGroupForMember(actor: Actor, groupId: string): Promise<GroupView | null> {
  if (!isVerified(actor) || !isUuid(groupId)) return null;
  const me = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: actor.id } },
    select: { role: true },
  });
  if (!me) return null;

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      marginPercent: true,
      members: { select: { role: true, user: { select: PERSON } } },
      invitations: {
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        select: { id: true, createdAt: true, invitedUser: { select: PERSON } },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!group) return null;
  const unassignedTaskCount = await db.task.count({ where: { groupId, assignments: { none: {} } } });

  return {
    id: group.id,
    name: group.name,
    startDate: group.startDate,
    endDate: group.endDate,
    marginPercent: group.marginPercent,
    myRole: me.role,
    members: group.members
      .map((m) => ({ ...m.user, role: m.role }))
      .sort((a, b) => (a.role === b.role ? byName(a, b) : a.role === "leader" ? -1 : 1)),
    pendingInvitations: group.invitations.map((i) => ({ id: i.id, user: i.invitedUser, createdAt: i.createdAt })),
    taskCount: group._count.tasks,
    unassignedTaskCount,
  };
}

export type MyGroup = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  myRole: GroupRole;
  memberCount: number;
};

/** Groupes de l'utilisateur, deadline la plus proche d'abord. */
export async function listMyGroups(actor: Actor): Promise<MyGroup[]> {
  if (!isVerified(actor)) return [];
  const rows = await db.groupMember.findMany({
    where: { userId: actor.id },
    orderBy: [{ group: { endDate: "asc" } }, { group: { name: "asc" } }],
    select: {
      role: true,
      group: {
        select: { id: true, name: true, startDate: true, endDate: true, _count: { select: { members: true } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.group.id,
    name: r.group.name,
    startDate: r.group.startDate,
    endDate: r.group.endDate,
    myRole: r.role,
    memberCount: r.group._count.members,
  }));
}

// ---------------------------------------------------------------------------
// Création et modification

const datesAreValid = (input: { startDate: Date; endDate: Date }) =>
  input.endDate.getTime() >= input.startDate.getTime();

/** Tout membre de la promo crée un groupe et en devient le chef (§4.3). */
export async function createGroup(
  actor: Actor,
  input: CreateGroupInput,
): Promise<{ ok: true; groupId: string } | GroupFailure> {
  if (!isVerified(actor)) return fail("unverified");
  if (!datesAreValid(input)) return fail("invalid_dates");
  // La promo vient de l'adhésion, jamais du formulaire.
  const first = await db.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
  if (!first) return fail("no_promo");

  return inGroupTransaction(async (tx) => {
    if (!(await lockPromo(tx, first.promoId))) return fail("no_promo");
    const me = await tx.promoMember.findUnique({ where: { userId: actor.id }, select: { promoId: true } });
    if (me?.promoId !== first.promoId) return fail("no_promo");
    const group = await tx.group.create({
      data: {
        promoId: first.promoId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: actor.id,
        // marginPercent : 20 par défaut (schéma).
        members: { create: { userId: actor.id, role: "leader" } },
      },
      select: { id: true },
    });
    return { ok: true as const, groupId: group.id };
  }, fail("conflict"));
}

/** Nom, dates et marge : chef uniquement (§6.3, Paramètres du groupe). */
export async function updateGroup(actor: Actor, input: UpdateGroupInput): Promise<{ ok: true } | GroupFailure> {
  if (!isVerified(actor)) return fail("unverified");
  if (!datesAreValid(input)) return fail("invalid_dates");
  return inGroupTransaction(async (tx) => {
    const access = await requireGroupRole(tx, actor, input.groupId, "leader");
    if (!access.ok) return access;
    await tx.group.update({
      where: { id: input.groupId },
      data: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        marginPercent: input.marginPercent,
      },
    });
    return { ok: true as const };
  }, fail("conflict"));
}

/**
 * Suppression par le chef uniquement (§4.3). Tâches, assignations,
 * dépendances, réunions, membres et invitations sont supprimés en cascade.
 */
export async function deleteGroup(actor: Actor, input: { groupId: string }): Promise<{ ok: true } | GroupFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await requireGroupRole(tx, actor, input.groupId, "leader");
    if (!access.ok) return access;
    await tx.group.delete({ where: { id: input.groupId } });
    return { ok: true as const };
  }, fail("conflict"));
}

// ---------------------------------------------------------------------------
// Départs et passation

/**
 * Quitter le groupe (§4.4), en une seule transaction :
 * - membre : ses tâches partagées restent aux autres, celles dont il était le
 *   seul assigné deviennent non assignées ;
 * - chef : successeur obligatoire, membre du groupe, qui devient chef ;
 * - dernier membre : le groupe est supprimé avec ses données (§4.3).
 */
export async function leaveGroup(
  actor: Actor,
  input: LeaveGroupInput,
): Promise<{ ok: true; groupDeleted: boolean } | GroupFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await requireGroupRole(tx, actor, input.groupId, "member");
    if (!access.ok) return access;
    const members = await tx.groupMember.findMany({ where: { groupId: input.groupId }, select: { userId: true } });
    const plan = planGroupDeparture({
      leaverId: actor.id,
      leaverRole: access.role,
      memberIds: members.map((m) => m.userId),
      successorId: input.successorId,
    });
    if (!plan.ok) return fail(plan.error);

    if (plan.kind === "delete_group") {
      await tx.group.delete({ where: { id: input.groupId } });
      return { ok: true as const, groupDeleted: true };
    }

    await releaseAssignments(tx, actor.id, [input.groupId]);
    // Départ, puis passation : un seul chef par groupe (index unique partiel).
    await tx.groupMember.delete({ where: { groupId_userId: { groupId: input.groupId, userId: actor.id } } });
    if (plan.newLeaderId) {
      await tx.groupMember.update({
        where: { groupId_userId: { groupId: input.groupId, userId: plan.newLeaderId } },
        data: { role: "leader" },
      });
    }
    return { ok: true as const, groupDeleted: false };
  }, fail("conflict"));
}

/** Passation (§6.3) : le chef nomme un membre, qui devient chef immédiatement. */
export async function transferLeadership(
  actor: Actor,
  input: { groupId: string; successorId: string },
): Promise<{ ok: true } | GroupFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await requireGroupRole(tx, actor, input.groupId, "leader");
    if (!access.ok) return access;
    const members = await tx.groupMember.findMany({ where: { groupId: input.groupId }, select: { userId: true } });
    if (!isValidSuccessor(actor.id, members.map((m) => m.userId), input.successorId)) {
      return fail("invalid_successor");
    }
    await tx.groupMember.update({
      where: { groupId_userId: { groupId: input.groupId, userId: actor.id } },
      data: { role: "member" },
    });
    await tx.groupMember.update({
      where: { groupId_userId: { groupId: input.groupId, userId: input.successorId } },
      data: { role: "leader" },
    });
    return { ok: true as const };
  }, fail("conflict"));
}
