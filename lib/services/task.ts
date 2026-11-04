import { db } from "@/lib/db";
import type { GroupRole, TaskStatus } from "@/generated/prisma/client";
import { cycleAfterReplacing } from "@/lib/domain/dependencies";
import { groupProgress } from "@/lib/domain/progress";
import {
  byName,
  inGroupTransaction,
  isUuid,
  isVerified,
  PERSON,
  requireGroupRole,
  type Person,
} from "@/lib/services/group";
import type { Actor, Tx } from "@/lib/services/promo";
import type {
  CreateTaskInput,
  TaskAssigneesInput,
  TaskDependenciesInput,
  TaskStatusInput,
  UpdateTaskInput,
} from "@/lib/validation/task";

// Tâches (§4.5) et avancement (§4.7). Chaque écriture verrouille le groupe
// (promo puis groupe, comme les départs) et revérifie les droits dans la
// transaction :
// - titre, durée, assignations, dépendances, création, suppression : chef ;
// - statut : tout membre du groupe.
// Un non-membre reçoit « not_found », y compris pour une tâche d'un autre
// groupe : il n'apprend rien de son existence.

export type TaskError =
  | "unverified"
  | "not_found"
  | "not_leader"
  | "invalid_assignee"
  | "invalid_dependency"
  | "self_dependency"
  | "dependency_cycle"
  | "conflict";

export type TaskFailure = { ok: false; error: TaskError };

export const TASK_ERROR_MESSAGES: Record<TaskError, string> = {
  unverified: "Validez votre adresse email avant de continuer.",
  not_found: "Tâche introuvable.",
  not_leader: "Seul le chef du groupe peut effectuer cette action.",
  invalid_assignee: "Seuls les membres du groupe peuvent être assignés à une tâche.",
  invalid_dependency: "Une tâche ne peut dépendre que d'autres tâches du même groupe.",
  self_dependency: "Une tâche ne peut pas dépendre d'elle-même.",
  dependency_cycle: "Cette dépendance créerait une boucle entre les tâches.",
  conflict: "Le groupe a changé pendant l'opération. Rechargez la page et réessayez.",
};

const fail = (error: TaskError): TaskFailure => ({ ok: false, error });
const CONFLICT = fail("conflict");

/**
 * Sous verrou du groupe de la tâche : l'utilisateur en est membre (ou chef si
 * `leader`) et la tâche existe toujours.
 */
async function lockTask(
  tx: Tx,
  actor: Actor,
  taskId: string,
  needed: "member" | "leader",
): Promise<{ ok: true; groupId: string } | TaskFailure> {
  if (!isUuid(taskId)) return fail("not_found");
  const task = await tx.task.findUnique({ where: { id: taskId }, select: { groupId: true } });
  if (!task) return fail("not_found");
  const access = await requireGroupRole(tx, actor, task.groupId, needed);
  if (!access.ok) return fail(access.error === "not_leader" ? "not_leader" : "not_found");
  // Elle a pu être supprimée avant la prise du verrou.
  const still = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!still) return fail("not_found");
  return { ok: true, groupId: task.groupId };
}

/** Tous les assignés sont membres du groupe (§4.5, §8). */
async function assigneesAreMembers(tx: Tx, groupId: string, assigneeIds: readonly string[]): Promise<boolean> {
  if (assigneeIds.length === 0) return true;
  const count = await tx.groupMember.count({ where: { groupId, userId: { in: [...assigneeIds] } } });
  return count === new Set(assigneeIds).size;
}

/** Toutes les dépendances sont des tâches du même groupe. */
async function dependenciesInGroup(tx: Tx, groupId: string, dependsOnIds: readonly string[]): Promise<boolean> {
  if (dependsOnIds.length === 0) return true;
  const count = await tx.task.count({ where: { groupId, id: { in: [...dependsOnIds] } } });
  return count === new Set(dependsOnIds).size;
}

/**
 * Une réunion n'existe que pour une tâche à plusieurs assignés (§4.5), comme
 * lors d'un départ (lib/services/departure.ts).
 */
async function dropMeetingIfSingle(tx: Tx, taskId: string, assigneeCount: number) {
  if (assigneeCount < 2) await tx.meeting.deleteMany({ where: { taskId } });
}

// ---------------------------------------------------------------------------
// Lecture

export type TaskRef = { id: string; title: string; status: TaskStatus };

export type TaskItem = {
  id: string;
  title: string;
  durationDays: number;
  status: TaskStatus;
  assignees: Person[];
  dependsOn: TaskRef[];
  /** Aucun assigné : à signaler (§4.6, §6.5). */
  isUnassigned: boolean;
};

const TASK_SELECT = {
  id: true,
  title: true,
  durationDays: true,
  status: true,
  assignments: { select: { user: { select: PERSON } } },
  dependencies: { select: { dependsOn: { select: { id: true, title: true, status: true } } } },
} as const;

type TaskRow = {
  id: string;
  title: string;
  durationDays: number;
  status: TaskStatus;
  assignments: { user: Person }[];
  dependencies: { dependsOn: TaskRef }[];
};

const byTitle = (a: TaskRef, b: TaskRef) => a.title.localeCompare(b.title, "fr");

function toItem(row: TaskRow): TaskItem {
  const assignees = row.assignments.map((a) => a.user).sort(byName);
  return {
    id: row.id,
    title: row.title,
    durationDays: row.durationDays,
    status: row.status,
    assignees,
    dependsOn: row.dependencies.map((d) => d.dependsOn).sort(byTitle),
    isUnassigned: assignees.length === 0,
  };
}

async function memberRole(actor: Actor, groupId: string): Promise<GroupRole | null> {
  if (!isVerified(actor) || !isUuid(groupId)) return null;
  const me = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: actor.id } },
    select: { role: true },
  });
  return me?.role ?? null;
}

const listMembers = async (groupId: string): Promise<Person[]> =>
  (await db.groupMember.findMany({ where: { groupId }, select: { user: { select: PERSON } } }))
    .map((m) => m.user)
    .sort(byName);

export type GroupTasksView = {
  groupId: string;
  myRole: GroupRole;
  members: Person[];
  /** Ordre de création. */
  tasks: TaskItem[];
  progressPercent: number;
  unassignedCount: number;
};

/** Tâches d'un groupe pour l'un de ses membres ; null pour tout autre utilisateur. */
export async function getGroupTasks(actor: Actor, groupId: string): Promise<GroupTasksView | null> {
  const myRole = await memberRole(actor, groupId);
  if (!myRole) return null;
  const [rows, members] = await Promise.all([
    db.task.findMany({ where: { groupId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: TASK_SELECT }),
    listMembers(groupId),
  ]);
  const tasks = rows.map(toItem);
  return {
    groupId,
    myRole,
    members,
    tasks,
    progressPercent: groupProgress(tasks),
    unassignedCount: tasks.filter((t) => t.isUnassigned).length,
  };
}

export type TaskDetailView = {
  groupId: string;
  myRole: GroupRole;
  task: TaskItem & { dependents: TaskRef[] };
  members: Person[];
  /** Autres tâches du groupe, candidates comme dépendances. */
  otherTasks: TaskRef[];
};

/**
 * Une tâche, si elle appartient au groupe de l'URL et que l'utilisateur en est
 * membre ; null sinon.
 */
export async function getTaskForMember(actor: Actor, groupId: string, taskId: string): Promise<TaskDetailView | null> {
  if (!isUuid(taskId)) return null;
  const myRole = await memberRole(actor, groupId);
  if (!myRole) return null;
  const row = await db.task.findFirst({
    where: { id: taskId, groupId },
    select: { ...TASK_SELECT, dependents: { select: { task: { select: { id: true, title: true, status: true } } } } },
  });
  if (!row) return null;
  const [members, otherTasks] = await Promise.all([
    listMembers(groupId),
    db.task.findMany({
      where: { groupId, id: { not: taskId } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, status: true },
    }),
  ]);
  return {
    groupId,
    myRole,
    task: { ...toItem(row), dependents: row.dependents.map((d) => d.task).sort(byTitle) },
    members,
    otherTasks,
  };
}

// ---------------------------------------------------------------------------
// Écriture

/** Création par le chef, avec assignés et dépendances facultatifs. */
export async function createTask(
  actor: Actor,
  input: CreateTaskInput,
): Promise<{ ok: true; taskId: string } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await requireGroupRole(tx, actor, input.groupId, "leader");
    if (!access.ok) return fail(access.error === "not_leader" ? "not_leader" : "not_found");
    if (!(await assigneesAreMembers(tx, input.groupId, input.assigneeIds))) return fail("invalid_assignee");
    // Une tâche neuve n'a pas de dépendante : elle ne peut pas fermer de cycle.
    if (!(await dependenciesInGroup(tx, input.groupId, input.dependsOnIds))) return fail("invalid_dependency");
    const task = await tx.task.create({
      data: {
        groupId: input.groupId,
        title: input.title,
        durationDays: input.durationDays,
        createdById: actor.id,
        assignments: { create: input.assigneeIds.map((userId) => ({ userId })) },
        dependencies: { create: input.dependsOnIds.map((dependsOnTaskId) => ({ dependsOnTaskId })) },
      },
      select: { id: true },
    });
    return { ok: true as const, taskId: task.id };
  }, CONFLICT);
}

/** Titre et durée : chef uniquement (§4.7). */
export async function updateTask(actor: Actor, input: UpdateTaskInput): Promise<{ ok: true } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await lockTask(tx, actor, input.taskId, "leader");
    if (!access.ok) return access;
    await tx.task.update({
      where: { id: input.taskId },
      data: { title: input.title, durationDays: input.durationDays },
    });
    return { ok: true as const };
  }, CONFLICT);
}

/** Remplace les assignés : chef uniquement, membres du groupe uniquement. */
export async function setTaskAssignees(actor: Actor, input: TaskAssigneesInput): Promise<{ ok: true } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await lockTask(tx, actor, input.taskId, "leader");
    if (!access.ok) return access;
    if (!(await assigneesAreMembers(tx, access.groupId, input.assigneeIds))) return fail("invalid_assignee");
    await tx.taskAssignment.deleteMany({ where: { taskId: input.taskId, userId: { notIn: input.assigneeIds } } });
    await tx.taskAssignment.createMany({
      data: input.assigneeIds.map((userId) => ({ taskId: input.taskId, userId })),
      skipDuplicates: true,
    });
    await dropMeetingIfSingle(tx, input.taskId, input.assigneeIds.length);
    return { ok: true as const };
  }, CONFLICT);
}

/**
 * Remplace les dépendances : chef uniquement, même groupe, sans
 * auto-dépendance ni cycle. Le contrôle de cycle porte sur les dépendances
 * relues sous le verrou du groupe : deux ajouts concurrents qui formeraient
 * une boucle sont sérialisés, et le second est refusé.
 */
export async function setTaskDependencies(
  actor: Actor,
  input: TaskDependenciesInput,
): Promise<{ ok: true } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  if (input.dependsOnIds.includes(input.taskId)) return fail("self_dependency");
  return inGroupTransaction(async (tx) => {
    const access = await lockTask(tx, actor, input.taskId, "leader");
    if (!access.ok) return access;
    if (!(await dependenciesInGroup(tx, access.groupId, input.dependsOnIds))) return fail("invalid_dependency");
    const edges = await tx.taskDependency.findMany({
      where: { task: { groupId: access.groupId } },
      select: { taskId: true, dependsOnTaskId: true },
    });
    if (cycleAfterReplacing(edges, input.taskId, input.dependsOnIds)) return fail("dependency_cycle");
    await tx.taskDependency.deleteMany({
      where: { taskId: input.taskId, dependsOnTaskId: { notIn: input.dependsOnIds } },
    });
    await tx.taskDependency.createMany({
      data: input.dependsOnIds.map((dependsOnTaskId) => ({ taskId: input.taskId, dependsOnTaskId })),
      skipDuplicates: true,
    });
    return { ok: true as const };
  }, CONFLICT);
}

/** Statut : tout membre du groupe (§4.7). */
export async function setTaskStatus(actor: Actor, input: TaskStatusInput): Promise<{ ok: true } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await lockTask(tx, actor, input.taskId, "member");
    if (!access.ok) return access;
    await tx.task.update({ where: { id: input.taskId }, data: { status: input.status } });
    return { ok: true as const };
  }, CONFLICT);
}

/** Suppression par le chef ; assignations, dépendances et réunion suivent en cascade. */
export async function deleteTask(
  actor: Actor,
  input: { taskId: string },
): Promise<{ ok: true; groupId: string } | TaskFailure> {
  if (!isVerified(actor)) return fail("unverified");
  return inGroupTransaction(async (tx) => {
    const access = await lockTask(tx, actor, input.taskId, "leader");
    if (!access.ok) return access;
    await tx.task.delete({ where: { id: input.taskId } });
    return { ok: true as const, groupId: access.groupId };
  }, CONFLICT);
}
