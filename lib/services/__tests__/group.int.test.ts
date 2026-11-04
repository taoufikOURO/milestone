import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";
import { createPromo, joinPromo } from "@/lib/services/promo";
import {
  createGroup,
  deleteGroup,
  getGroupForMember,
  leaveGroup,
  listMyGroups,
  transferLeadership,
  updateGroup,
} from "@/lib/services/group";
import {
  cancelInvitation,
  inviteToGroup,
  listMyPendingInvitations,
  respondToInvitation,
} from "@/lib/services/invitation";

const db = createTestClient();

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

type User = Awaited<ReturnType<typeof verified>>;

async function verified() {
  const u = await createUser(db);
  return db.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
}

/** Promo avec son délégué et `n` membres supplémentaires. */
async function promo(n = 2) {
  const delegate = await verified();
  const created = await createPromo(delegate, { name: "Promo" });
  if (!created.ok) throw new Error(created.error);
  const members: User[] = [];
  for (let i = 0; i < n; i += 1) {
    const u = await verified();
    const joined = await joinPromo(u, { code: created.code });
    if (!joined.ok) throw new Error(joined.error);
    members.push(u);
  }
  return { promoId: created.promoId, code: created.code, delegate, members };
}

const dates = { startDate: new Date("2026-11-02T00:00:00Z"), endDate: new Date("2026-11-30T00:00:00Z") };

async function newGroup(leader: User, name = "Projet") {
  const r = await createGroup(leader, { name, ...dates });
  if (!r.ok) throw new Error(r.error);
  return r.groupId;
}

/** Invite puis accepte : `user` devient membre du groupe. */
async function addMember(leader: User, groupId: string, user: User) {
  const inv = await inviteToGroup(leader, { groupId, username: user.username });
  if (!inv.ok) throw new Error(inv.error);
  const res = await respondToInvitation(user, { invitationId: inv.invitationId, decision: "accept" });
  if (!res.ok) throw new Error(res.error);
}

async function task(groupId: string, assignees: string[], title = "Tâche") {
  return db.task.create({
    data: { groupId, title, durationDays: 2, assignments: { create: assignees.map((userId) => ({ userId })) } },
  });
}

const assignees = async (taskId: string) =>
  (await db.taskAssignment.findMany({ where: { taskId } })).map((a) => a.userId).sort();

const roleIn = async (groupId: string, userId: string) =>
  (await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { role: true } }))
    ?.role ?? null;

describe("création d'un groupe", () => {
  it("tout membre de la promo crée un groupe et en devient le chef, marge 20 % par défaut", async () => {
    const { promoId, members } = await promo(1);
    const [m] = members;
    const groupId = await newGroup(m, "Projet web");
    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    expect(group).toMatchObject({ promoId, name: "Projet web", marginPercent: 20, createdById: m.id, ...dates });
    expect(await roleIn(groupId, m.id)).toBe("leader");
    expect(await db.groupMember.count({ where: { groupId } })).toBe(1);
  });

  it("refuse sans promo et refuse une fin avant le début", async () => {
    const outsider = await verified();
    expect(await createGroup(outsider, { name: "X", ...dates })).toEqual({ ok: false, error: "no_promo" });
    const { delegate } = await promo(0);
    expect(
      await createGroup(delegate, { name: "X", startDate: dates.endDate, endDate: dates.startDate }),
    ).toEqual({ ok: false, error: "invalid_dates" });
    expect(await db.group.count()).toBe(0);
  });

  it("le chef modifie nom, dates et marge ; un membre ne peut pas", async () => {
    const { delegate, members } = await promo(1);
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, members[0]);
    const input = { groupId, name: "Renommé", startDate: dates.startDate, endDate: new Date("2026-12-15T00:00:00Z"), marginPercent: 35 };
    expect(await updateGroup(members[0], input)).toEqual({ ok: false, error: "not_leader" });
    expect(await updateGroup(delegate, input)).toEqual({ ok: true });
    expect(await db.group.findUniqueOrThrow({ where: { id: groupId } })).toMatchObject({
      name: "Renommé",
      marginPercent: 35,
      endDate: new Date("2026-12-15T00:00:00Z"),
    });
  });
});

describe("invitations", () => {
  it("refuse une invitation hors promo (autre promo, sans promo, nom inconnu)", async () => {
    const { delegate } = await promo(0);
    const groupId = await newGroup(delegate);
    const other = (await promo(0)).delegate;
    const noPromo = await verified();
    for (const username of [other.username, noPromo.username, "inconnu_total"]) {
      expect(await inviteToGroup(delegate, { groupId, username })).toEqual({ ok: false, error: "user_not_in_promo" });
    }
    expect(await db.groupInvitation.count()).toBe(0);
  });

  it("refuse une invitation en double, un membre déjà présent et un non-chef", async () => {
    const { delegate, members } = await promo(3);
    const [a, b, c] = members;
    const groupId = await newGroup(delegate);
    expect(await inviteToGroup(delegate, { groupId, username: a.username })).toMatchObject({ ok: true });
    expect(await inviteToGroup(delegate, { groupId, username: a.username })).toEqual({
      ok: false,
      error: "already_invited",
    });
    expect(await inviteToGroup(delegate, { groupId, username: delegate.username })).toEqual({
      ok: false,
      error: "already_member",
    });
    await addMember(delegate, groupId, b);
    expect(await inviteToGroup(delegate, { groupId, username: b.username })).toEqual({
      ok: false,
      error: "already_member",
    });
    expect(await inviteToGroup(b, { groupId, username: c.username })).toEqual({ ok: false, error: "not_leader" });
    expect(await db.groupInvitation.count({ where: { groupId, invitedUserId: a.id, status: "pending" } })).toBe(1);
  });

  it("garde une seule invitation en attente sous des demandes concurrentes", async () => {
    const { delegate, members } = await promo(1);
    const groupId = await newGroup(delegate);
    const results = await Promise.all([
      inviteToGroup(delegate, { groupId, username: members[0].username }),
      inviteToGroup(delegate, { groupId, username: members[0].username }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({ ok: false, error: "already_invited" });
    expect(await db.groupInvitation.count({ where: { status: "pending" } })).toBe(1);
  });

  it("refus puis acceptation : on ne rejoint le groupe qu'après acceptation", async () => {
    const { delegate, members } = await promo(2);
    const [a, intruder] = members;
    const groupId = await newGroup(delegate);

    const first = await inviteToGroup(delegate, { groupId, username: a.username });
    if (!first.ok) throw new Error(first.error);
    // En attente : pas encore membre, ni accès au groupe.
    expect(await roleIn(groupId, a.id)).toBeNull();
    expect(await getGroupForMember(a, groupId)).toBeNull();
    expect((await listMyPendingInvitations(a)).map((i) => i.group.id)).toEqual([groupId]);

    // Seul l'invité répond.
    for (const u of [intruder, delegate]) {
      expect(await respondToInvitation(u, { invitationId: first.invitationId, decision: "accept" })).toEqual({
        ok: false,
        error: "invitation_not_found",
      });
    }
    expect(await roleIn(groupId, intruder.id)).toBeNull();

    expect(await respondToInvitation(a, { invitationId: first.invitationId, decision: "decline" })).toEqual({
      ok: true,
      groupId,
      joined: false,
    });
    expect(await roleIn(groupId, a.id)).toBeNull();
    expect(await listMyPendingInvitations(a)).toEqual([]);
    // Une invitation déjà traitée n'accepte plus de réponse.
    expect(await respondToInvitation(a, { invitationId: first.invitationId, decision: "accept" })).toEqual({
      ok: false,
      error: "invitation_not_found",
    });

    // Nouvelle invitation après un refus, puis acceptation.
    const second = await inviteToGroup(delegate, { groupId, username: a.username });
    if (!second.ok) throw new Error(second.error);
    expect(await respondToInvitation(a, { invitationId: second.invitationId, decision: "accept" })).toEqual({
      ok: true,
      groupId,
      joined: true,
    });
    expect(await roleIn(groupId, a.id)).toBe("member");
    expect(await db.groupInvitation.findUniqueOrThrow({ where: { id: second.invitationId } })).toMatchObject({
      status: "accepted",
    });
    expect((await getGroupForMember(a, groupId))?.myRole).toBe("member");
  });

  it("un étudiant peut être membre de plusieurs groupes de sa promo", async () => {
    const { delegate, members } = await promo(2);
    const [a, b] = members;
    const g1 = await newGroup(delegate, "G1");
    const g2 = await newGroup(b, "G2");
    await addMember(delegate, g1, a);
    await addMember(b, g2, a);
    expect((await listMyGroups(a)).map((g) => g.name).sort()).toEqual(["G1", "G2"]);
  });
});

describe("annulation d'une invitation", () => {
  it("seul le chef de ce groupe annule une invitation en attente", async () => {
    const { delegate, members } = await promo(3);
    const [invitee, member, otherLeader] = members;
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, member);
    await newGroup(otherLeader, "Autre groupe");
    const inv = await inviteToGroup(delegate, { groupId, username: invitee.username });
    if (!inv.ok) throw new Error(inv.error);
    const outsiderPromo = (await promo(0)).delegate;

    // Membre non chef : refus. Membre d'un autre groupe ou d'une autre promo : groupe introuvable.
    expect(await cancelInvitation(member, { invitationId: inv.invitationId })).toEqual({
      ok: false,
      error: "not_leader",
    });
    for (const u of [otherLeader, outsiderPromo, invitee]) {
      expect(await cancelInvitation(u, { invitationId: inv.invitationId })).toEqual({ ok: false, error: "not_found" });
    }
    expect(await db.groupInvitation.count({ where: { id: inv.invitationId, status: "pending" } })).toBe(1);

    expect(await cancelInvitation(delegate, { invitationId: inv.invitationId })).toEqual({ ok: true, groupId });
    expect(await db.groupInvitation.count({ where: { id: inv.invitationId } })).toBe(0);
    expect(await listMyPendingInvitations(invitee)).toEqual([]);
    // L'invité ne peut plus l'accepter ; le chef peut réinviter.
    expect(await respondToInvitation(invitee, { invitationId: inv.invitationId, decision: "accept" })).toEqual({
      ok: false,
      error: "invitation_not_found",
    });
    expect(await roleIn(groupId, invitee.id)).toBeNull();
    expect(await inviteToGroup(delegate, { groupId, username: invitee.username })).toMatchObject({ ok: true });
  });

  it("refuse d'annuler une invitation déjà acceptée ou refusée", async () => {
    const { delegate, members } = await promo(2);
    const [accepting, declining] = members;
    const groupId = await newGroup(delegate);
    const ids: string[] = [];
    for (const [u, decision] of [
      [accepting, "accept"],
      [declining, "decline"],
    ] as const) {
      const inv = await inviteToGroup(delegate, { groupId, username: u.username });
      if (!inv.ok) throw new Error(inv.error);
      await respondToInvitation(u, { invitationId: inv.invitationId, decision });
      ids.push(inv.invitationId);
    }
    for (const invitationId of ids) {
      expect(await cancelInvitation(delegate, { invitationId })).toEqual({
        ok: false,
        error: "invitation_not_found",
      });
    }
    expect(await db.groupInvitation.findMany({ where: { id: { in: ids } }, select: { status: true } })).toHaveLength(2);
    expect(await roleIn(groupId, accepting.id)).toBe("member");
    expect(await cancelInvitation(delegate, { invitationId: "pas-un-uuid" })).toEqual({
      ok: false,
      error: "invitation_not_found",
    });
  });
});

describe("départs", () => {
  it("départ d'un membre : tâches seules non assignées, tâches partagées restent aux autres (critère 7)", async () => {
    const { delegate, members } = await promo(2);
    const [leaver, other] = members;
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, leaver);
    await addMember(delegate, groupId, other);
    const solo = await task(groupId, [leaver.id], "Seule");
    const pair = await task(groupId, [leaver.id, delegate.id], "À deux");
    const trio = await task(groupId, [leaver.id, delegate.id, other.id], "À trois");
    await db.meeting.create({ data: { taskId: pair.id, startsAt: dates.startDate, endsAt: dates.startDate } });
    await db.meeting.create({ data: { taskId: trio.id, startsAt: dates.startDate, endsAt: dates.startDate } });
    // Témoin : même étudiant dans un autre groupe, intact.
    const elsewhere = await newGroup(other, "Ailleurs");
    await addMember(other, elsewhere, leaver);
    const kept = await task(elsewhere, [leaver.id]);

    expect(await leaveGroup(leaver, { groupId })).toEqual({ ok: true, groupDeleted: false });

    expect(await roleIn(groupId, leaver.id)).toBeNull();
    expect(await assignees(solo.id)).toEqual([]);
    expect(await assignees(pair.id)).toEqual([delegate.id]);
    expect(await assignees(trio.id)).toEqual([delegate.id, other.id].sort());
    expect(await db.meeting.count({ where: { taskId: pair.id } })).toBe(0);
    expect(await db.meeting.count({ where: { taskId: trio.id } })).toBe(1);
    expect(await db.task.count({ where: { groupId } })).toBe(3);
    expect((await getGroupForMember(delegate, groupId))?.unassignedTaskCount).toBe(1);
    expect(await assignees(kept.id)).toEqual([leaver.id]);
    expect(await roleIn(elsewhere, leaver.id)).toBe("member");
    expect(await roleIn(groupId, delegate.id)).toBe("leader");
  });

  it("départ du chef bloqué sans successeur valide (critère 6), puis passation", async () => {
    const { delegate, members } = await promo(2);
    const [m, outsider] = members;
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, m);
    const t = await task(groupId, [delegate.id]);

    expect(await leaveGroup(delegate, { groupId })).toEqual({ ok: false, error: "leader_successor_required" });
    expect(await leaveGroup(delegate, { groupId, successorId: outsider.id })).toEqual({
      ok: false,
      error: "invalid_successor",
    });
    expect(await leaveGroup(delegate, { groupId, successorId: delegate.id })).toEqual({
      ok: false,
      error: "invalid_successor",
    });
    expect(await roleIn(groupId, delegate.id)).toBe("leader");
    expect(await assignees(t.id)).toEqual([delegate.id]);

    expect(await leaveGroup(delegate, { groupId, successorId: m.id })).toEqual({ ok: true, groupDeleted: false });
    expect(await roleIn(groupId, delegate.id)).toBeNull();
    expect(await roleIn(groupId, m.id)).toBe("leader");
    expect(await assignees(t.id)).toEqual([]);
  });

  it("passation sans départ : le successeur devient chef, l'ancien chef reste membre", async () => {
    const { delegate, members } = await promo(2);
    const [m, outsider] = members;
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, m);
    expect(await transferLeadership(m, { groupId, successorId: m.id })).toEqual({ ok: false, error: "not_leader" });
    expect(await transferLeadership(delegate, { groupId, successorId: outsider.id })).toEqual({
      ok: false,
      error: "invalid_successor",
    });
    expect(await transferLeadership(delegate, { groupId, successorId: m.id })).toEqual({ ok: true });
    expect(await roleIn(groupId, m.id)).toBe("leader");
    expect(await roleIn(groupId, delegate.id)).toBe("member");
  });

  it("le dernier membre qui part supprime le groupe et ses données, dans la même transaction", async () => {
    const { delegate, members } = await promo(1);
    const groupId = await newGroup(delegate);
    const t1 = await task(groupId, [delegate.id]);
    const t2 = await task(groupId, [delegate.id]);
    await db.taskDependency.create({ data: { taskId: t2.id, dependsOnTaskId: t1.id } });
    await inviteToGroup(delegate, { groupId, username: members[0].username });

    expect(await leaveGroup(delegate, { groupId })).toEqual({ ok: true, groupDeleted: true });
    expect(await db.group.count({ where: { id: groupId } })).toBe(0);
    expect(await db.task.count()).toBe(0);
    expect(await db.taskDependency.count()).toBe(0);
    expect(await db.groupInvitation.count()).toBe(0);
    expect(await listMyPendingInvitations(members[0])).toEqual([]);
  });
});

describe("suppression d'un groupe", () => {
  it("refusée à un non-chef (critère 8), acceptée pour le chef avec toutes les données", async () => {
    const { delegate, members } = await promo(1);
    const [m] = members;
    const groupId = await newGroup(delegate);
    await addMember(delegate, groupId, m);
    const t1 = await task(groupId, [delegate.id, m.id]);
    const t2 = await task(groupId, [m.id]);
    await db.taskDependency.create({ data: { taskId: t2.id, dependsOnTaskId: t1.id } });
    await db.meeting.create({ data: { taskId: t1.id, startsAt: dates.startDate, endsAt: dates.startDate } });
    const witness = await newGroup(m, "Témoin");
    await task(witness, [m.id]);

    expect(await deleteGroup(m, { groupId })).toEqual({ ok: false, error: "not_leader" });
    expect(await db.group.count({ where: { id: groupId } })).toBe(1);

    expect(await deleteGroup(delegate, { groupId })).toEqual({ ok: true });
    expect(await db.group.count({ where: { id: groupId } })).toBe(0);
    expect(await db.groupMember.count({ where: { groupId } })).toBe(0);
    expect(await db.task.count({ where: { groupId } })).toBe(0);
    expect(await db.taskAssignment.count({ where: { taskId: { in: [t1.id, t2.id] } } })).toBe(0);
    expect(await db.taskDependency.count()).toBe(0);
    expect(await db.meeting.count()).toBe(0);
    expect(await db.task.count({ where: { groupId: witness } })).toBe(1);
  });
});

describe("accès d'un membre d'un autre groupe", () => {
  it("ne voit pas le groupe et ne peut agir dessus, même dans la même promo", async () => {
    const { delegate, members } = await promo(3);
    const [m, otherLeader, target] = members;
    const groupId = await newGroup(delegate, "Cible");
    await addMember(delegate, groupId, m);
    await newGroup(otherLeader, "Le sien");
    const inv = await inviteToGroup(delegate, { groupId, username: target.username });
    if (!inv.ok) throw new Error(inv.error);
    const outsiderPromo = (await promo(0)).delegate;

    for (const u of [otherLeader, outsiderPromo]) {
      expect(await getGroupForMember(u, groupId)).toBeNull();
      const notFound = { ok: false, error: "not_found" };
      expect(await updateGroup(u, { groupId, name: "Pirate", ...dates, marginPercent: 0 })).toEqual(notFound);
      expect(await deleteGroup(u, { groupId })).toEqual(notFound);
      expect(await leaveGroup(u, { groupId })).toEqual(notFound);
      expect(await transferLeadership(u, { groupId, successorId: u.id })).toEqual(notFound);
      expect(await inviteToGroup(u, { groupId, username: otherLeader.username })).toEqual(notFound);
      expect(await respondToInvitation(u, { invitationId: inv.invitationId, decision: "accept" })).toEqual({
        ok: false,
        error: "invitation_not_found",
      });
    }
    // Identifiant mal formé (URL) : null, sans erreur.
    expect(await getGroupForMember(delegate, "pas-un-uuid")).toBeNull();

    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    expect(group.name).toBe("Cible");
    expect(await db.groupMember.count({ where: { groupId } })).toBe(2);
    expect(await roleIn(groupId, delegate.id)).toBe("leader");
    expect(await db.groupInvitation.count({ where: { groupId, status: "pending" } })).toBe(1);
  });
});
