import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";

const db = createTestClient();

async function createPromo(code: string) {
  return db.promo.create({ data: { name: `Promo ${code}`, code } });
}

async function createGroup(promoId: string) {
  return db.group.create({
    data: {
      promoId,
      name: "Projet",
      startDate: new Date("2026-11-02"),
      endDate: new Date("2026-11-30"),
    },
  });
}

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("contraintes de la base", () => {
  it("refuse un deuxième délégué dans la même promo", async () => {
    const promo = await createPromo("PROMOA");
    const [a, b, c] = [await createUser(db), await createUser(db), await createUser(db)];

    await db.promoMember.create({ data: { promoId: promo.id, userId: a.id, role: "delegate" } });
    // Témoin : un simple membre est accepté.
    await db.promoMember.create({ data: { promoId: promo.id, userId: c.id, role: "member" } });

    await expect(
      db.promoMember.create({ data: { promoId: promo.id, userId: b.id, role: "delegate" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("refuse un deuxième chef dans le même groupe", async () => {
    const promo = await createPromo("PROMOB");
    const group = await createGroup(promo.id);
    const [a, b, c] = [await createUser(db), await createUser(db), await createUser(db)];

    await db.groupMember.create({ data: { groupId: group.id, userId: a.id, role: "leader" } });
    await db.groupMember.create({ data: { groupId: group.id, userId: c.id, role: "member" } });

    await expect(
      db.groupMember.create({ data: { groupId: group.id, userId: b.id, role: "leader" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("refuse qu'un étudiant rejoigne une deuxième promo", async () => {
    const first = await createPromo("PROMOC");
    const second = await createPromo("PROMOD");
    const user = await createUser(db);

    await db.promoMember.create({ data: { promoId: first.id, userId: user.id } });

    await expect(
      db.promoMember.create({ data: { promoId: second.id, userId: user.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("refuse qu'une tâche dépende d'elle-même", async () => {
    const promo = await createPromo("PROMOE");
    const group = await createGroup(promo.id);
    const [t1, t2] = [
      await db.task.create({ data: { groupId: group.id, title: "A", durationDays: 1 } }),
      await db.task.create({ data: { groupId: group.id, title: "B", durationDays: 2 } }),
    ];

    // Témoin : une dépendance entre deux tâches distinctes est acceptée.
    await db.taskDependency.create({ data: { taskId: t2.id, dependsOnTaskId: t1.id } });

    await expect(
      db.taskDependency.create({ data: { taskId: t1.id, dependsOnTaskId: t1.id } }),
    ).rejects.toThrow(/task_dependencies_no_self/);
  });
});
