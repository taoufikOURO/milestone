import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";
import { createPromo, joinPromo } from "@/lib/services/promo";
import { createGroup } from "@/lib/services/group";
import { getPromoCalendar } from "@/lib/services/calendar";

const db = createTestClient();

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

async function verified() {
  const u = await createUser(db);
  return db.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
}

async function setup() {
  const delegate = await verified();
  const created = await createPromo(delegate, { name: "Promo" });
  if (!created.ok) throw new Error(created.error);
  const member = await verified();
  const joined = await joinPromo(member, { code: created.code });
  if (!joined.ok) throw new Error(joined.error);
  return { promoId: created.promoId, delegate, member };
}

async function newGroup(leader: { id: string; emailVerifiedAt: Date | null }, name: string, start: string, end: string) {
  const r = await createGroup(leader, { name, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`) });
  if (!r.ok) throw new Error(r.error);
  return r.groupId;
}

describe("getPromoCalendar", () => {
  it("ne renvoie rien à un non-membre de la promo", async () => {
    const { promoId, delegate } = await setup();
    await newGroup(delegate, "Alpha", "2026-11-02", "2026-11-30");

    const outsider = await verified();
    expect(await getPromoCalendar(outsider, promoId)).toBeNull();

    // Membre d'une autre promo : rien non plus.
    const other = await verified();
    const otherPromo = await createPromo(other, { name: "Autre" });
    if (!otherPromo.ok) throw new Error(otherPromo.error);
    expect(await getPromoCalendar(other, promoId)).toBeNull();
  });

  it("ne renvoie rien à un compte non validé", async () => {
    const { promoId, member } = await setup();
    await db.user.update({ where: { id: member.id }, data: { emailVerifiedAt: null } });
    expect(await getPromoCalendar({ id: member.id, emailVerifiedAt: null }, promoId)).toBeNull();
  });

  it("renvoie à un membre tous les groupes de sa promo, avec l'avancement", async () => {
    const { promoId, delegate, member } = await setup();
    const alpha = await newGroup(delegate, "Alpha", "2026-11-02", "2026-11-30");
    const beta = await newGroup(member, "Beta", "2026-11-10", "2026-12-15");
    const gamma = await newGroup(delegate, "Gamma", "2026-11-20", "2026-11-20");

    // Alpha : 1 j fait sur 4 j au total → 25 %. Beta : tâche en cours → 0 %. Gamma : sans tâche → 0 %.
    await db.task.createMany({
      data: [
        { groupId: alpha, title: "A1", durationDays: 1, status: "done" },
        { groupId: alpha, title: "A2", durationDays: 3, status: "todo" },
        { groupId: beta, title: "B1", durationDays: 2, status: "in_progress" },
      ],
    });

    // Groupe d'une autre promo : absent du résultat.
    const other = await verified();
    await createPromo(other, { name: "Autre" });
    await newGroup(other, "Intrus", "2026-11-01", "2026-11-05");

    const result = await getPromoCalendar(member, promoId);
    expect(result).not.toBeNull();
    expect(result!.map((g) => g.name)).toEqual(["Alpha", "Beta", "Gamma"]);

    const byId = Object.fromEntries(result!.map((g) => [g.id, g]));
    expect(byId[alpha]).toMatchObject({ progressPercent: 25, isMember: false, deadline: new Date("2026-11-30T00:00:00Z") });
    expect(byId[beta]).toMatchObject({ progressPercent: 0, isMember: true, deadline: new Date("2026-12-15T00:00:00Z") });
    expect(byId[gamma]).toMatchObject({ progressPercent: 0, isMember: false });
    expect(byId[alpha].startDate).toEqual(new Date("2026-11-02T00:00:00Z"));
  });
});
