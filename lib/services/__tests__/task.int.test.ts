import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestClient, createUser, resetDatabase } from "@/tests/test-db";
import { createPromo, joinPromo } from "@/lib/services/promo";
import { createGroup, getGroupForMember } from "@/lib/services/group";
import { inviteToGroup, respondToInvitation } from "@/lib/services/invitation";
import {
  createTask,
  deleteTask,
  getGroupTasks,
  getTaskForMember,
  setTaskAssignees,
  setTaskDependencies,
  setTaskStatus,
  updateTask,
} from "@/lib/services/task";

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

const dates = { startDate: new Date("2026-11-02T00:00:00Z"), endDate: new Date("2026-11-30T00:00:00Z") };

/** Promo avec un chef de groupe, un membre du groupe et un étudiant hors groupe. */
async function setup() {
  const leader = await verified();
  const promo = await createPromo(leader, { name: "Promo" });
  if (!promo.ok) throw new Error(promo.error);
  const member = await verified();
  const outsider = await verified();
  for (const u of [member, outsider]) {
    const joined = await joinPromo(u, { code: promo.code });
    if (!joined.ok) throw new Error(joined.error);
  }
  const groupId = await newGroup(leader);
  await addMember(leader, groupId, member);
  return { leader, member, outsider, groupId };
}

async function newGroup(leader: User, name = "Projet") {
  const r = await createGroup(leader, { name, ...dates });
  if (!r.ok) throw new Error(r.error);
  return r.groupId;
}

async function addMember(leader: User, groupId: string, user: User) {
  const inv = await inviteToGroup(leader, { groupId, username: user.username });
  if (!inv.ok) throw new Error(inv.error);
  const res = await respondToInvitation(user, { invitationId: inv.invitationId, decision: "accept" });
  if (!res.ok) throw new Error(res.error);
}

async function newTask(
  leader: User,
  groupId: string,
  opts: { title?: string; durationDays?: number; assigneeIds?: string[]; dependsOnIds?: string[] } = {},
) {
  const r = await createTask(leader, {
    groupId,
    title: opts.title ?? "Tâche",
    durationDays: opts.durationDays ?? 1,
    assigneeIds: opts.assigneeIds ?? [],
    dependsOnIds: opts.dependsOnIds ?? [],
  });
  if (!r.ok) throw new Error(r.error);
  return r.taskId;
}

const depsOf = async (taskId: string) =>
  (await db.taskDependency.findMany({ where: { taskId } })).map((d) => d.dependsOnTaskId).sort();

describe("création et lecture", () => {
  it("le chef crée une tâche avec assignés et dépendances", async () => {
    const { leader, member, groupId } = await setup();
    const a = await newTask(leader, groupId, { title: "A" });
    const b = await newTask(leader, groupId, { title: "B", assigneeIds: [member.id], dependsOnIds: [a] });

    const view = await getTaskForMember(member, groupId, b);
    expect(view?.task.assignees.map((p) => p.id)).toEqual([member.id]);
    expect(view?.task.dependsOn.map((d) => d.id)).toEqual([a]);
    expect(view?.task.isUnassigned).toBe(false);
  });

  it("signale une tâche sans assigné comme non assignée", async () => {
    const { leader, groupId } = await setup();
    await newTask(leader, groupId);
    const view = await getGroupTasks(leader, groupId);
    expect(view?.tasks[0].isUnassigned).toBe(true);
    expect(view?.unassignedCount).toBe(1);
  });

  it("un membre ne peut pas créer de tâche", async () => {
    const { member, groupId } = await setup();
    const r = await createTask(member, { groupId, title: "X", durationDays: 1, assigneeIds: [], dependsOnIds: [] });
    expect(r).toEqual({ ok: false, error: "not_leader" });
  });

  it("un non-membre ne voit ni le groupe ni la tâche", async () => {
    const { leader, outsider, groupId } = await setup();
    const t = await newTask(leader, groupId);
    expect(await getGroupTasks(outsider, groupId)).toBeNull();
    expect(await getTaskForMember(outsider, groupId, t)).toBeNull();
    expect(await setTaskStatus(outsider, { taskId: t, status: "done" })).toEqual({ ok: false, error: "not_found" });
  });

  it("une tâche n'est pas lisible via l'URL d'un autre groupe", async () => {
    const { leader, groupId } = await setup();
    const other = await newGroup(leader, "Autre");
    const t = await newTask(leader, other);
    expect(await getTaskForMember(leader, groupId, t)).toBeNull();
  });
});

describe("droits d'édition", () => {
  it("refuse la modification par un membre", async () => {
    const { leader, member, groupId } = await setup();
    const a = await newTask(leader, groupId, { title: "A" });
    const b = await newTask(leader, groupId, { title: "B" });

    expect(await updateTask(member, { taskId: a, title: "Piraté", durationDays: 9 })).toEqual({
      ok: false,
      error: "not_leader",
    });
    expect(await setTaskAssignees(member, { taskId: a, assigneeIds: [member.id] })).toEqual({
      ok: false,
      error: "not_leader",
    });
    expect(await setTaskDependencies(member, { taskId: a, dependsOnIds: [b] })).toEqual({
      ok: false,
      error: "not_leader",
    });
    expect(await deleteTask(member, { taskId: a })).toEqual({ ok: false, error: "not_leader" });

    const row = await db.task.findUniqueOrThrow({ where: { id: a }, include: { assignments: true } });
    expect(row.title).toBe("A");
    expect(row.durationDays).toBe(1);
    expect(row.assignments).toHaveLength(0);
    expect(await depsOf(a)).toEqual([]);
  });

  it("le chef modifie le titre et la durée", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId);
    expect(await updateTask(leader, { taskId: a, title: "Rapport", durationDays: 4 })).toEqual({ ok: true });
    const row = await db.task.findUniqueOrThrow({ where: { id: a } });
    expect([row.title, row.durationDays]).toEqual(["Rapport", 4]);
  });

  it("accepte le changement de statut par un membre", async () => {
    const { leader, member, groupId } = await setup();
    const a = await newTask(leader, groupId);
    expect(await setTaskStatus(member, { taskId: a, status: "in_progress" })).toEqual({ ok: true });
    expect((await db.task.findUniqueOrThrow({ where: { id: a } })).status).toBe("in_progress");
  });

  it("le chef supprime une tâche", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId);
    expect(await deleteTask(leader, { taskId: a })).toEqual({ ok: true, groupId });
    expect(await db.task.count()).toBe(0);
  });
});

describe("assignations", () => {
  it("refuse l'assignation d'un non-membre", async () => {
    const { leader, member, outsider, groupId } = await setup();
    const a = await newTask(leader, groupId, { assigneeIds: [member.id] });

    expect(await setTaskAssignees(leader, { taskId: a, assigneeIds: [member.id, outsider.id] })).toEqual({
      ok: false,
      error: "invalid_assignee",
    });
    const r = await createTask(leader, {
      groupId,
      title: "X",
      durationDays: 1,
      assigneeIds: [outsider.id],
      dependsOnIds: [],
    });
    expect(r).toEqual({ ok: false, error: "invalid_assignee" });
    const assigned = await db.taskAssignment.findMany({ where: { taskId: a } });
    expect(assigned.map((x) => x.userId)).toEqual([member.id]);
  });

  it("remplace les assignés et supprime la réunion quand il n'en reste qu'un", async () => {
    const { leader, member, groupId } = await setup();
    const a = await newTask(leader, groupId, { assigneeIds: [leader.id, member.id] });
    await db.meeting.create({ data: { taskId: a, startsAt: dates.startDate, endsAt: dates.startDate } });

    expect(await setTaskAssignees(leader, { taskId: a, assigneeIds: [member.id] })).toEqual({ ok: true });
    const assigned = await db.taskAssignment.findMany({ where: { taskId: a } });
    expect(assigned.map((x) => x.userId)).toEqual([member.id]);
    expect(await db.meeting.count({ where: { taskId: a } })).toBe(0);
  });
});

describe("dépendances", () => {
  it("refuse un cycle", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId, { title: "A" });
    const b = await newTask(leader, groupId, { title: "B", dependsOnIds: [a] });
    const c = await newTask(leader, groupId, { title: "C", dependsOnIds: [b] });

    expect(await setTaskDependencies(leader, { taskId: a, dependsOnIds: [c] })).toEqual({
      ok: false,
      error: "dependency_cycle",
    });
    expect(await setTaskDependencies(leader, { taskId: a, dependsOnIds: [b] })).toEqual({
      ok: false,
      error: "dependency_cycle",
    });
    expect(await depsOf(a)).toEqual([]);
  });

  it("refuse l'auto-dépendance", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId);
    expect(await setTaskDependencies(leader, { taskId: a, dependsOnIds: [a] })).toEqual({
      ok: false,
      error: "self_dependency",
    });
  });

  it("refuse un cycle formé par deux ajouts concurrents", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId, { title: "A" });
    const b = await newTask(leader, groupId, { title: "B" });

    const results = await Promise.all([
      setTaskDependencies(leader, { taskId: a, dependsOnIds: [b] }),
      setTaskDependencies(leader, { taskId: b, dependsOnIds: [a] }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: "dependency_cycle" }]);
    expect(await db.taskDependency.count()).toBe(1);
  });

  it("refuse une dépendance vers une tâche d'un autre groupe", async () => {
    const { leader, groupId } = await setup();
    const other = await newGroup(leader, "Autre");
    const foreign = await newTask(leader, other, { title: "Ailleurs" });
    const a = await newTask(leader, groupId, { title: "A" });

    expect(await setTaskDependencies(leader, { taskId: a, dependsOnIds: [foreign] })).toEqual({
      ok: false,
      error: "invalid_dependency",
    });
    const r = await createTask(leader, {
      groupId,
      title: "B",
      durationDays: 1,
      assigneeIds: [],
      dependsOnIds: [foreign],
    });
    expect(r).toEqual({ ok: false, error: "invalid_dependency" });
    expect(await depsOf(a)).toEqual([]);
  });

  it("remplace les dépendances existantes", async () => {
    const { leader, groupId } = await setup();
    const a = await newTask(leader, groupId, { title: "A" });
    const b = await newTask(leader, groupId, { title: "B" });
    const c = await newTask(leader, groupId, { title: "C", dependsOnIds: [a] });

    expect(await setTaskDependencies(leader, { taskId: c, dependsOnIds: [b] })).toEqual({ ok: true });
    expect(await depsOf(c)).toEqual([b]);
    expect(await setTaskDependencies(leader, { taskId: c, dependsOnIds: [] })).toEqual({ ok: true });
    expect(await depsOf(c)).toEqual([]);
  });
});

describe("avancement", () => {
  it("vaut 0 % pour un groupe sans tâche", async () => {
    const { leader, groupId } = await setup();
    expect((await getGroupTasks(leader, groupId))?.progressPercent).toBe(0);
    expect((await getGroupForMember(leader, groupId))?.progressPercent).toBe(0);
  });

  it("suit les changements de statut, au prorata des durées", async () => {
    const { leader, member, groupId } = await setup();
    const long = await newTask(leader, groupId, { title: "Long", durationDays: 3 });
    const short = await newTask(leader, groupId, { title: "Court", durationDays: 1 });
    const progress = async () => (await getGroupTasks(member, groupId))?.progressPercent;

    await setTaskStatus(member, { taskId: long, status: "in_progress" });
    expect(await progress()).toBe(0);
    await setTaskStatus(member, { taskId: long, status: "done" });
    expect(await progress()).toBe(75);
    await setTaskStatus(member, { taskId: short, status: "done" });
    expect(await progress()).toBe(100);
    await setTaskStatus(leader, { taskId: long, status: "todo" });
    expect(await progress()).toBe(25);
    expect((await getGroupForMember(member, groupId))?.progressPercent).toBe(25);
  });
});
