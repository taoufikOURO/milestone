import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";

// Action de mise à jour du groupe, de bout en bout avec le vrai service :
// seule la session est simulée. La marge (§4.6, décision 19) n'est
// modifiable que par le chef, et la validation est faite côté serveur.

const session = vi.hoisted(() => ({ user: null as unknown }));

vi.mock("@/lib/auth/guards", () => ({ requireVerifiedUser: async () => session.user }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { updateGroupAction } = await import("@/lib/actions/group");
const { createPromo, joinPromo } = await import("@/lib/services/promo");
const { createGroup } = await import("@/lib/services/group");
const { inviteToGroup, respondToInvitation } = await import("@/lib/services/invitation");

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

/** Groupe de la promo avec son chef et un membre non chef. */
async function setup() {
  const leader = await verified();
  const member = await verified();
  const promo = await createPromo(leader, { name: "Promo" });
  if (!promo.ok) throw new Error(promo.error);
  const joined = await joinPromo(member, { code: promo.code });
  if (!joined.ok) throw new Error(joined.error);
  const group = await createGroup(leader, {
    name: "Projet",
    startDate: new Date("2026-11-02T00:00:00Z"),
    endDate: new Date("2026-11-30T00:00:00Z"),
  });
  if (!group.ok) throw new Error(group.error);
  const inv = await inviteToGroup(leader, { groupId: group.groupId, username: member.username });
  if (!inv.ok) throw new Error(inv.error);
  const res = await respondToInvitation(member, { invitationId: inv.invitationId, decision: "accept" });
  if (!res.ok) throw new Error(res.error);
  return { leader, member, groupId: group.groupId };
}

function form(groupId: string, marginPercent: string) {
  const fd = new FormData();
  fd.set("groupId", groupId);
  fd.set("name", "Projet");
  fd.set("startDate", "2026-11-02");
  fd.set("endDate", "2026-11-30");
  fd.set("marginPercent", marginPercent);
  return fd;
}

const marginOf = async (groupId: string) =>
  (await db.group.findUniqueOrThrow({ where: { id: groupId }, select: { marginPercent: true } })).marginPercent;

describe("updateGroupAction : marge du groupe", () => {
  it("un membre non chef ne peut pas modifier la marge", async () => {
    const { member, groupId } = await setup();
    session.user = member;
    const state = await updateGroupAction({}, form(groupId, "0"));
    expect(state.error).toBe("Seul le chef du groupe peut effectuer cette action.");
    expect(state.success).toBeUndefined();
    expect(await marginOf(groupId)).toBe(20);
  });

  it("le chef règle la marge à 0 % (pas de marge) puis à 100 %", async () => {
    const { leader, groupId } = await setup();
    session.user = leader;
    expect((await updateGroupAction({}, form(groupId, "0"))).success).toBe("Modifications enregistrées.");
    expect(await marginOf(groupId)).toBe(0);
    expect((await updateGroupAction({}, form(groupId, "100"))).success).toBe("Modifications enregistrées.");
    expect(await marginOf(groupId)).toBe(100);
  });

  it.each(["-1", "101", "12.5", ""])("refuse côté serveur la marge %j, même pour le chef", async (value) => {
    const { leader, groupId } = await setup();
    session.user = leader;
    const state = await updateGroupAction({}, form(groupId, value));
    expect(state.errors?.marginPercent).toBeDefined();
    expect(await marginOf(groupId)).toBe(20);
  });
});
