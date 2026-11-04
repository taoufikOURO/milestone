import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";

// Codes imposés pour tester la régénération en cas de collision ; sinon le vrai générateur.
const forcedCodes = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/promo-code", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/promo-code")>();
  return { ...actual, generatePromoCode: () => forcedCodes.shift() ?? actual.generatePromoCode() };
});

const { createPromo, deletePromo, findMyPromoId, getPromoOverview, joinPromo, leavePromo, transferDelegation } =
  await import("@/lib/services/promo");
const { isPromoCodeFormat } = await import("@/lib/promo-code");

const db = createTestClient();

beforeEach(async () => {
  forcedCodes.length = 0;
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

/** Utilisateur validé, au format attendu par les services. */
async function verified() {
  const u = await createUser(db);
  return db.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
}

async function promoWithDelegate(name = "Promo") {
  const delegate = await verified();
  const result = await createPromo(delegate, { name });
  if (!result.ok) throw new Error(result.error);
  return { delegate, promoId: result.promoId, code: result.code };
}

async function member(code: string) {
  const u = await verified();
  const r = await joinPromo(u, { code });
  if (!r.ok) throw new Error(r.error);
  return u;
}

async function group(promoId: string, members: { id: string; role: "leader" | "member" }[], name = "Projet") {
  return db.group.create({
    data: {
      promoId,
      name,
      startDate: new Date("2026-11-02"),
      endDate: new Date("2026-11-30"),
      members: { create: members.map((m) => ({ userId: m.id, role: m.role })) },
    },
  });
}

async function task(groupId: string, assignees: string[], title = "Tâche") {
  return db.task.create({
    data: {
      groupId,
      title,
      durationDays: 2,
      assignments: { create: assignees.map((userId) => ({ userId })) },
    },
  });
}

const role = async (userId: string) =>
  (await db.promoMember.findUnique({ where: { userId }, select: { role: true } }))?.role ?? null;

describe("création d'une promo", () => {
  it("fait du créateur le délégué et génère un code au bon format", async () => {
    const { delegate, promoId, code } = await promoWithDelegate("L3 Info");
    expect(isPromoCodeFormat(code)).toBe(true);
    const promo = await db.promo.findUniqueOrThrow({ where: { id: promoId } });
    expect(promo).toMatchObject({ name: "L3 Info", code, createdById: delegate.id });
    expect(await role(delegate.id)).toBe("delegate");
  });

  it("refuse une deuxième promo à un utilisateur déjà dans une promo", async () => {
    const { delegate, code } = await promoWithDelegate();
    expect(await createPromo(delegate, { name: "Autre" })).toEqual({ ok: false, error: "already_in_promo" });

    const m = await member(code);
    expect(await createPromo(m, { name: "Autre" })).toEqual({ ok: false, error: "already_in_promo" });
    expect(await db.promo.count()).toBe(1);
  });

  it("régénère le code en cas de collision", async () => {
    const { code } = await promoWithDelegate();
    forcedCodes.push(code, "ABCDEFGHJK");
    const other = await verified();
    const result = await createPromo(other, { name: "Seconde" });
    expect(result).toMatchObject({ ok: true, code: "ABCDEFGHJK" });
  });

  it("refuse un utilisateur dont l'email n'est pas validé", async () => {
    const u = await createUser(db);
    expect(await createPromo(u, { name: "X" })).toEqual({ ok: false, error: "unverified" });
  });
});

describe("rejoindre une promo", () => {
  it("rejoint par code, en tant que membre", async () => {
    const { promoId, code } = await promoWithDelegate();
    const u = await verified();
    expect(await joinPromo(u, { code })).toEqual({ ok: true, promoId });
    expect(await role(u.id)).toBe("member");
  });

  it("répond par un message générique à un code inconnu ou mal formé", async () => {
    await promoWithDelegate();
    const u = await verified();
    expect(await joinPromo(u, { code: "ZZZZZZZZZZ" })).toEqual({ ok: false, error: "invalid_code" });
    expect(await joinPromo(u, { code: "abc" })).toEqual({ ok: false, error: "invalid_code" });
    expect(await findMyPromoId(u)).toBeNull();
  });

  it("refuse une deuxième promo (critère 4)", async () => {
    const a = await promoWithDelegate("A");
    const b = await promoWithDelegate("B");
    const u = await member(a.code);
    expect(await joinPromo(u, { code: b.code })).toEqual({ ok: false, error: "already_in_promo" });
    expect(await findMyPromoId(u)).toBe(a.promoId);
  });

  it("garde une seule adhésion sous des demandes concurrentes", async () => {
    const a = await promoWithDelegate("A");
    const b = await promoWithDelegate("B");
    const u = await verified();
    const results = await Promise.all([joinPromo(u, { code: a.code }), joinPromo(u, { code: b.code })]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.promoMember.count({ where: { userId: u.id } })).toBe(1);
  });
});

describe("quitter la promo", () => {
  it("un membre quitte la promo et ses groupes ; ses tâches seules deviennent non assignées", async () => {
    const { delegate, promoId, code } = await promoWithDelegate();
    const leaver = await member(code);
    const g = await group(promoId, [
      { id: delegate.id, role: "leader" },
      { id: leaver.id, role: "member" },
    ]);
    const solo = await task(g.id, [leaver.id], "Seul");
    const shared = await task(g.id, [leaver.id, delegate.id], "Partagée");
    await db.meeting.create({ data: { taskId: shared.id, startsAt: new Date("2026-11-03"), endsAt: new Date("2026-11-03") } });
    const other = await task(g.id, [delegate.id], "Autre");

    expect(await leavePromo(leaver, { groupSuccessors: {} })).toEqual({ ok: true });

    expect(await findMyPromoId(leaver)).toBeNull();
    expect(await db.groupMember.count({ where: { userId: leaver.id } })).toBe(0);
    const assignees = async (taskId: string) =>
      (await db.taskAssignment.findMany({ where: { taskId } })).map((a) => a.userId);
    expect(await assignees(solo.id)).toEqual([]);
    expect(await assignees(shared.id)).toEqual([delegate.id]);
    expect(await assignees(other.id)).toEqual([delegate.id]);
    // Plus qu'un assigné : la réunion n'a plus lieu d'être.
    expect(await db.meeting.count({ where: { taskId: shared.id } })).toBe(0);
    // Les tâches restent dans le groupe.
    expect(await db.task.count({ where: { groupId: g.id } })).toBe(3);
  });

  it("supprime un groupe dont le partant était le seul membre", async () => {
    const { promoId, code } = await promoWithDelegate();
    const leaver = await member(code);
    const g = await group(promoId, [{ id: leaver.id, role: "leader" }]);
    await task(g.id, [leaver.id]);
    expect(await leavePromo(leaver, { groupSuccessors: {} })).toEqual({ ok: true });
    expect(await db.group.count({ where: { id: g.id } })).toBe(0);
  });

  it("bloque le délégué sans successeur (critère 5), puis transmet le rôle", async () => {
    const { delegate, promoId, code } = await promoWithDelegate();
    const m = await member(code);
    const outsider = (await promoWithDelegate("Autre")).delegate;

    expect(await leavePromo(delegate, { groupSuccessors: {} })).toEqual({
      ok: false,
      error: "delegate_successor_required",
    });
    expect(await leavePromo(delegate, { successorId: outsider.id, groupSuccessors: {} })).toEqual({
      ok: false,
      error: "invalid_successor",
    });
    expect(await leavePromo(delegate, { successorId: delegate.id, groupSuccessors: {} })).toEqual({
      ok: false,
      error: "invalid_successor",
    });
    expect(await role(delegate.id)).toBe("delegate");

    expect(await leavePromo(delegate, { successorId: m.id, groupSuccessors: {} })).toEqual({ ok: true });
    expect(await role(delegate.id)).toBeNull();
    expect(await role(m.id)).toBe("delegate");
    expect(await findMyPromoId(m)).toBe(promoId);
  });

  it("refuse au délégué seul de quitter sans supprimer la promo", async () => {
    const { delegate } = await promoWithDelegate();
    expect(await leavePromo(delegate, { groupSuccessors: {} })).toEqual({ ok: false, error: "delegate_alone" });
  });

  it("bloque le chef sans successeur dans chacun de ses groupes", async () => {
    const { delegate, promoId, code } = await promoWithDelegate();
    const chef = await member(code);
    const g1 = await group(promoId, [{ id: chef.id, role: "leader" }, { id: delegate.id, role: "member" }], "G1");
    const g2 = await group(promoId, [{ id: chef.id, role: "leader" }, { id: delegate.id, role: "member" }], "G2");

    const none = await leavePromo(chef, { groupSuccessors: {} });
    expect(none).toMatchObject({ ok: false, error: "leader_successor_required" });
    expect(none.ok ? [] : none.groups?.map((g) => g.name).sort()).toEqual(["G1", "G2"]);

    // Un seul successeur sur deux, ou un successeur hors du groupe : refus, rien ne change.
    const outsider = await member(code);
    expect(
      await leavePromo(chef, { groupSuccessors: { [g1.id]: delegate.id, [g2.id]: outsider.id } }),
    ).toMatchObject({ ok: false, error: "leader_successor_required", groups: [{ id: g2.id, name: "G2" }] });
    expect(await findMyPromoId(chef)).toBe(promoId);
    expect(await db.groupMember.count({ where: { userId: chef.id } })).toBe(2);

    expect(await leavePromo(chef, { groupSuccessors: { [g1.id]: delegate.id, [g2.id]: delegate.id } })).toEqual({
      ok: true,
    });
    const leaders = await db.groupMember.findMany({ where: { role: "leader" }, select: { groupId: true, userId: true } });
    expect(leaders.map((l) => l.userId)).toEqual([delegate.id, delegate.id]);
    expect(await db.groupMember.count({ where: { userId: chef.id } })).toBe(0);
  });
});

describe("gestion par le délégué", () => {
  it("transmet la délégation à un membre", async () => {
    const { delegate, promoId, code } = await promoWithDelegate();
    const m = await member(code);
    expect(await transferDelegation(m, { promoId, successorId: m.id })).toEqual({ ok: false, error: "not_delegate" });
    expect(await transferDelegation(delegate, { promoId, successorId: m.id })).toEqual({ ok: true });
    expect(await role(delegate.id)).toBe("member");
    expect(await role(m.id)).toBe("delegate");
  });

  it("supprime la promo en une transaction : membres partis, groupes et données supprimés", async () => {
    const { delegate, promoId, code } = await promoWithDelegate("À supprimer");
    const m = await member(code);
    const g = await group(promoId, [{ id: m.id, role: "leader" }, { id: delegate.id, role: "member" }]);
    const t1 = await task(g.id, [m.id, delegate.id]);
    const t2 = await task(g.id, [m.id]);
    await db.taskDependency.create({ data: { taskId: t2.id, dependsOnTaskId: t1.id } });
    await db.meeting.create({ data: { taskId: t1.id, startsAt: new Date("2026-11-03"), endsAt: new Date("2026-11-03") } });
    const invited = await verified();
    await db.groupInvitation.create({ data: { groupId: g.id, invitedUserId: invited.id } });

    // Témoin : une autre promo, intacte après la suppression.
    const kept = await promoWithDelegate("Témoin");
    const keptGroup = await group(kept.promoId, [{ id: kept.delegate.id, role: "leader" }]);
    await task(keptGroup.id, [kept.delegate.id]);

    expect(await deletePromo(m, { promoId })).toEqual({ ok: false, error: "not_delegate" });
    expect(await db.promo.count({ where: { id: promoId } })).toBe(1);

    expect(await deletePromo(delegate, { promoId })).toEqual({ ok: true });
    expect(await db.promo.count({ where: { id: promoId } })).toBe(0);
    expect(await db.promoMember.count({ where: { promoId } })).toBe(0);
    expect(await db.group.count({ where: { promoId } })).toBe(0);
    expect(await db.task.count({ where: { groupId: g.id } })).toBe(0);
    expect(await db.taskAssignment.count({ where: { taskId: { in: [t1.id, t2.id] } } })).toBe(0);
    expect(await db.taskDependency.count()).toBe(0);
    expect(await db.meeting.count()).toBe(0);
    expect(await db.groupInvitation.count()).toBe(0);
    // Les comptes existent toujours et peuvent rejoindre une autre promo.
    expect(await db.user.count({ where: { id: { in: [delegate.id, m.id] } } })).toBe(2);
    expect(await joinPromo(m, { code: kept.code })).toMatchObject({ ok: true });

    expect(await db.promo.count({ where: { id: kept.promoId } })).toBe(1);
    expect(await db.task.count({ where: { groupId: keptGroup.id } })).toBe(1);
  });
});

describe("non-membre", () => {
  it("ne voit rien de la promo et ne peut pas la gérer", async () => {
    const { delegate, promoId, code } = await promoWithDelegate("Secrète");
    await group(promoId, [{ id: delegate.id, role: "leader" }]);
    const outsider = await verified();
    const otherDelegate = (await promoWithDelegate("Autre")).delegate;

    for (const u of [outsider, otherDelegate]) {
      expect(await getPromoOverview(u, promoId)).toBeNull();
      expect(await transferDelegation(u, { promoId, successorId: delegate.id })).toEqual({
        ok: false,
        error: "not_member",
      });
      expect(await deletePromo(u, { promoId })).toEqual({ ok: false, error: "not_member" });
    }
    expect(await findMyPromoId(outsider)).toBeNull();
    expect(await db.promo.findUnique({ where: { id: promoId }, select: { code: true } })).toEqual({ code });
    expect(await role(delegate.id)).toBe("delegate");
  });

  it("un membre voit la promo sans le code ; le délégué voit le code", async () => {
    const { delegate, promoId, code } = await promoWithDelegate();
    const m = await member(code);
    const asMember = await getPromoOverview(m, promoId);
    expect(asMember).toMatchObject({ id: promoId, code: null, myRole: "member" });
    expect(asMember?.members.map((x) => x.id)).toEqual([delegate.id, m.id]);
    expect((await getPromoOverview(delegate, promoId))?.code).toBe(code);
  });
});
