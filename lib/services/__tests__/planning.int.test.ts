import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";
import { dateOfDay } from "@/lib/domain/timeline";
import { createPromo, joinPromo } from "@/lib/services/promo";
import { createGroup } from "@/lib/services/group";
import { inviteToGroup, respondToInvitation } from "@/lib/services/invitation";
import { createTask, setTaskAssignees, setTaskStatus } from "@/lib/services/task";
import { getGroupCalendar, getPersonalCalendar, planningToday } from "@/lib/services/planning";

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

// Le groupe commence aujourd'hui (PLANNING_TIMEZONE), sans marge : les jours
// planifiés sont prévisibles.
const today = planningToday();

async function newGroup(leader: User, name: string) {
  const r = await createGroup(leader, { name, startDate: dateOfDay(today), endDate: dateOfDay(today + 20) });
  if (!r.ok) throw new Error(r.error);
  await db.group.update({ where: { id: r.groupId }, data: { marginPercent: 0 } });
  return r.groupId;
}

async function addMember(leader: User, groupId: string, user: User) {
  const inv = await inviteToGroup(leader, { groupId, username: user.username });
  if (!inv.ok) throw new Error(inv.error);
  const res = await respondToInvitation(user, { invitationId: inv.invitationId, decision: "accept" });
  if (!res.ok) throw new Error(res.error);
}

async function newTask(leader: User, groupId: string, title: string, durationDays: number, assigneeIds: string[]) {
  const r = await createTask(leader, { groupId, title, durationDays, assigneeIds, dependsOnIds: [] });
  if (!r.ok) throw new Error(r.error);
  return r.taskId;
}

/**
 * Promo : alice (cheffe de Alpha), bob (Alpha), carol (Alpha), dan (cheffe de
 * Beta, hors Alpha).
 */
async function setup() {
  const alice = await verified();
  const promo = await createPromo(alice, { name: "Promo" });
  if (!promo.ok) throw new Error(promo.error);
  const [bob, carol, dan] = [await verified(), await verified(), await verified()];
  for (const u of [bob, carol, dan]) {
    const joined = await joinPromo(u, { code: promo.code });
    if (!joined.ok) throw new Error(joined.error);
  }
  const alpha = await newGroup(alice, "Alpha");
  await addMember(alice, alpha, bob);
  await addMember(alice, alpha, carol);
  const beta = await newGroup(dan, "Beta");
  return { alice, bob, carol, dan, alpha, beta };
}

describe("accès aux calendriers", () => {
  it("un membre voit le calendrier de ses groupes et leurs tâches", async () => {
    const { alice, bob, dan, alpha, beta } = await setup();
    await newTask(alice, alpha, "Maquettes", 2, [bob.id]);
    await newTask(dan, beta, "Pitch", 1, [dan.id]);

    const group = await getGroupCalendar(bob, alpha);
    expect(group).not.toBeNull();
    expect(group!.group.name).toBe("Alpha");
    expect(group!.tasks.map((t) => [t.title, t.start - today, t.end - today])).toEqual([["Maquettes", 0, 1]]);
    expect(group!.tasks[0].assignees.map((p) => p.id)).toEqual([bob.id]);

    const mine = await getPersonalCalendar(bob);
    expect(mine!.groups.map((g) => g.name)).toEqual(["Alpha"]);
    expect(mine!.tasks.map((t) => t.title)).toEqual(["Maquettes"]);
  });

  it("deux membres d'un groupe voient le même calendrier", async () => {
    const { alice, bob, carol, alpha } = await setup();
    await newTask(alice, alpha, "Maquettes", 2, [bob.id, carol.id]);
    await newTask(alice, alpha, "Contenus", 1, []);
    expect(await getGroupCalendar(bob, alpha)).toEqual(await getGroupCalendar(carol, alpha));
  });

  it("un non-membre de la promo ne reçoit rien", async () => {
    const { alpha } = await setup();
    const outsider = await verified();
    expect(await getGroupCalendar(outsider, alpha)).toBeNull();
    expect(await getPersonalCalendar(outsider)).toBeNull();
  });

  it("un compte non validé ne reçoit rien", async () => {
    const { bob, alpha } = await setup();
    const unverified = { id: bob.id, emailVerifiedAt: null };
    expect(await getGroupCalendar(unverified, alpha)).toBeNull();
    expect(await getPersonalCalendar(unverified)).toBeNull();
  });

  it("un membre d'un autre groupe de la promo ne voit pas le calendrier du groupe", async () => {
    const { alice, bob, dan, alpha } = await setup();
    await newTask(alice, alpha, "Maquettes", 2, [bob.id]);
    expect(await getGroupCalendar(dan, alpha)).toBeNull();
    expect(await getGroupCalendar(dan, "not-a-uuid")).toBeNull();

    const mine = await getPersonalCalendar(dan);
    expect(mine!.groups.map((g) => g.name)).toEqual(["Beta"]);
    expect(mine!.tasks).toEqual([]);
    expect(mine!.conflicts).toEqual([]);
  });

  it("Mon calendrier montre les tâches non assignées de mes groupes, avec un texte lisible", async () => {
    const { alice, bob, alpha } = await setup();
    await newTask(alice, alpha, "Contenus", 1, []);
    const mine = await getPersonalCalendar(bob);
    expect(mine!.conflicts).toHaveLength(1);
    expect(mine!.conflicts[0]).toMatchObject({ taskTitle: "Contenus", groupName: "Alpha", title: "Tâche non assignée" });
  });
});

describe("réunions", () => {
  it("une tâche à deux assignés génère une réunion, une tâche à un assigné n'en génère pas", async () => {
    const { alice, bob, carol, alpha } = await setup();
    await newTask(alice, alpha, "Solo", 1, [alice.id]);
    await newTask(alice, alpha, "Duo", 2, [bob.id, carol.id]);

    const view = await getGroupCalendar(bob, alpha);
    expect(view!.meetings.map((m) => [m.taskTitle, m.day - today])).toEqual([["Duo", 0]]);
    expect(view!.meetings[0].attendees.map((p) => p.id).sort()).toEqual([bob.id, carol.id].sort());
    const byTitle = Object.fromEntries(view!.tasks.map((t) => [t.title, t]));
    expect(byTitle.Solo.meetingDay).toBeNull();
    expect(byTitle.Duo.meetingDay).toBe(today);

    // Mon calendrier : la réunion apparaît chez ses participants seulement.
    expect((await getPersonalCalendar(carol))!.meetings.map((m) => m.taskTitle)).toEqual(["Duo"]);
    expect((await getPersonalCalendar(alice))!.meetings).toEqual([]);

    // Calculées, jamais écrites en base en v1.
    expect(await db.meeting.count()).toBe(0);
  });

  it("changer les assignés déplace la réunion au prochain calcul", async () => {
    const { alice, bob, carol, alpha } = await setup();
    // Alice est prise aujourd'hui et demain par une tâche en cours.
    const busy = await newTask(alice, alpha, "En cours", 2, [alice.id]);
    const status = await setTaskStatus(alice, { taskId: busy, status: "in_progress" });
    if (!status.ok) throw new Error(status.error);
    const duo = await newTask(alice, alpha, "Duo", 2, [bob.id, carol.id]);

    const before = await getGroupCalendar(bob, alpha);
    expect(before!.meetings.map((m) => [m.taskTitle, m.day - today])).toEqual([["Duo", 0]]);

    const changed = await setTaskAssignees(alice, { taskId: duo, assigneeIds: [alice.id, bob.id] });
    if (!changed.ok) throw new Error(changed.error);
    const after = await getGroupCalendar(bob, alpha);
    expect(after!.meetings.map((m) => [m.taskTitle, m.day - today])).toEqual([["Duo", 2]]);
    expect(after!.meetings[0].attendees.map((p) => p.id).sort()).toEqual([alice.id, bob.id].sort());

    // Un seul assigné : plus de réunion.
    const single = await setTaskAssignees(alice, { taskId: duo, assigneeIds: [bob.id] });
    if (!single.ok) throw new Error(single.error);
    expect((await getGroupCalendar(bob, alpha))!.meetings).toEqual([]);
    expect(await db.meeting.count()).toBe(0);
  });
});
