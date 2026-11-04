// Préparation des tâches et chemin critique (§4.6, étape 1). Module pur.

import { effectiveDuration } from "@/lib/planning/duration";
import type { Day, PlanningInput } from "@/lib/planning/types";

/** Tâche à planifier : ni terminée, ni rattachée à des données incohérentes. */
export type ActiveTask = {
  id: string;
  groupId: string;
  status: "todo" | "in_progress";
  effectiveDays: number;
  /** Dédoublonnés, triés. */
  assigneeIds: readonly string[];
  /**
   * Dépendances non terminées, dédoublonnées et triées. Vide pour une tâche en
   * cours : elle a déjà démarré, elle n'attend plus rien.
   */
  dependsOnIds: readonly string[];
  /** Premier jour possible : max(début du groupe, aujourd'hui), ou aujourd'hui si en cours. */
  windowStart: Day;
  deadline: Day;
  createdAt: number;
};

/** Ordre de création, puis identifiant (comparaison binaire, indépendante de la locale). */
export function byCreation(a: { createdAt: number; id: string }, b: { createdAt: number; id: string }): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Tâches non terminées, triées par ordre de création. Une dépendance terminée
 * est satisfaite et disparaît. Lève une erreur sur une entrée incohérente
 * (groupe inconnu, dépendance absente ou d'un autre groupe, identifiant en
 * double) : le service charge les données d'un seul tenant, cela ne doit pas
 * arriver.
 */
export function prepareTasks(input: PlanningInput): ActiveTask[] {
  const groups = new Map(input.groups.map((g) => [g.id, g]));
  const tasks = new Map(input.tasks.map((t) => [t.id, t]));
  if (tasks.size !== input.tasks.length) throw new Error("Identifiant de tâche en double.");

  const active: ActiveTask[] = [];
  for (const task of input.tasks) {
    const group = groups.get(task.groupId);
    if (!group) throw new Error(`Groupe inconnu pour la tâche ${task.id}.`);
    for (const depId of task.dependsOnIds) {
      if (tasks.get(depId)?.groupId !== task.groupId) {
        throw new Error(`Dépendance invalide ${depId} pour la tâche ${task.id}.`);
      }
    }
    if (task.status === "done") continue;
    const inProgress = task.status === "in_progress";
    active.push({
      id: task.id,
      groupId: task.groupId,
      status: task.status,
      effectiveDays: effectiveDuration(task.durationDays, group.marginPercent),
      assigneeIds: [...new Set(task.assigneeIds)].sort(),
      dependsOnIds: inProgress
        ? []
        : [...new Set(task.dependsOnIds.filter((id) => tasks.get(id)?.status !== "done"))].sort(),
      windowStart: inProgress ? input.today : Math.max(group.startDay, input.today),
      deadline: group.endDay,
      createdAt: task.createdAt,
    });
  }
  return active.sort(byCreation);
}

export type CpmResult = {
  /** Dates au plus tôt, sans charge. Absentes pour les tâches non ordonnables. */
  earliest: Map<string, { start: Day; end: Day }>;
  /** Travail restant de la tâche à la fin de sa chaîne : eff + max(tail des dépendantes). */
  tail: Map<string, number>;
  /** Tâches qui appartiennent à un cycle. */
  cycleMembers: Set<string>;
  /** Tâches non ordonnables : dans un cycle ou en aval d'un cycle. */
  unordered: Set<string>;
};

/**
 * Tri topologique de Kahn, passe avant (dates au plus tôt) et passe arrière
 * (tail). Itératif, termine même sur un cycle : les tâches restantes sont
 * rapportées au lieu de faire boucler le calcul.
 */
export function computeCpm(tasks: readonly ActiveTask[]): CpmResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dependents = new Map<string, string[]>();
  const pending = new Map<string, number>();
  for (const task of tasks) {
    pending.set(task.id, task.dependsOnIds.length);
    for (const depId of task.dependsOnIds) {
      const list = dependents.get(depId);
      if (list) list.push(task.id);
      else dependents.set(depId, [task.id]);
    }
  }

  const order = tasks.filter((t) => t.dependsOnIds.length === 0);
  for (let i = 0; i < order.length; i++) {
    for (const nextId of dependents.get(order[i].id) ?? []) {
      const left = pending.get(nextId)! - 1;
      pending.set(nextId, left);
      if (left === 0) order.push(byId.get(nextId)!);
    }
  }

  const earliest = new Map<string, { start: Day; end: Day }>();
  for (const task of order) {
    let start = task.windowStart;
    for (const depId of task.dependsOnIds) start = Math.max(start, earliest.get(depId)!.end + 1);
    earliest.set(task.id, { start, end: start + task.effectiveDays - 1 });
  }

  const tail = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const task = order[i];
    let after = 0;
    for (const nextId of dependents.get(task.id) ?? []) after = Math.max(after, tail.get(nextId) ?? 0);
    tail.set(task.id, task.effectiveDays + after);
  }

  const unordered = new Set(tasks.filter((t) => !earliest.has(t.id)).map((t) => t.id));
  const depsOf = (id: string) => byId.get(id)!.dependsOnIds;
  const cycleMembers = new Set([...unordered].filter((id) => reachesItself(id, depsOf, unordered)));
  return { earliest, tail, cycleMembers, unordered };
}

/** Vrai si `start` dépend de lui-même en ne passant que par `within`. */
function reachesItself(start: string, depsOf: (id: string) => readonly string[], within: ReadonlySet<string>): boolean {
  const seen = new Set<string>();
  const stack = [...depsOf(start)];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === start) return true;
    if (seen.has(id) || !within.has(id)) continue;
    seen.add(id);
    stack.push(...depsOf(id));
  }
  return false;
}
