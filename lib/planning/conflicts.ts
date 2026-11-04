// Conflits de planification (§4.6, étape 4). Module pur.

import { byCreation, type ActiveTask, type CpmResult } from "@/lib/planning/cpm";
import type { Conflict, Day, DeadlineCause, ScheduledTask } from "@/lib/planning/types";

/**
 * Pour chaque tâche bloquée, ses ancêtres non planifiables pour une raison
 * propre (sans assigné, membre d'un cycle), dans l'ordre de création. Un
 * ancêtre sans assigné qui est lui-même bloqué transmet aussi ses propres
 * racines : toutes doivent être levées. Parcours itératif, qui s'arrête aux
 * membres d'un cycle.
 */
export function blockedRoots(
  tasks: readonly ActiveTask[],
  cycleMembers: ReadonlySet<string>,
): Map<string, string[]> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const rank = new Map(tasks.map((t, i) => [t.id, i]));
  const isRoot = (id: string) => cycleMembers.has(id) || byId.get(id)!.assigneeIds.length === 0;

  const memo = new Map<string, Set<string>>();
  for (const task of tasks) {
    const stack = [task.id];
    while (stack.length > 0) {
      const id = stack[stack.length - 1];
      if (memo.has(id)) {
        stack.pop();
        continue;
      }
      const deps = byId.get(id)!.dependsOnIds;
      const missing = deps.filter((d) => !cycleMembers.has(d) && !memo.has(d));
      if (missing.length > 0) {
        stack.push(...missing);
        continue;
      }
      const roots = new Set<string>();
      for (const d of deps) {
        if (isRoot(d)) roots.add(d);
        if (!cycleMembers.has(d)) for (const r of memo.get(d)!) roots.add(r);
      }
      memo.set(id, roots);
      stack.pop();
    }
  }

  const blocked = new Map<string, string[]>();
  for (const task of tasks) {
    const roots = memo.get(task.id)!;
    if (cycleMembers.has(task.id) || roots.size === 0) continue;
    blocked.set(task.id, [...roots].sort((a, b) => rank.get(a)! - rank.get(b)!));
  }
  return blocked;
}

/** Cause d'un retard, la plus en amont d'abord ; null si la deadline est tenue. */
export function deadlineCause(
  task: Pick<ActiveTask, "deadline" | "windowStart" | "effectiveDays">,
  cpmEnd: Day,
  end: Day,
  today: Day,
): DeadlineCause | null {
  if (end <= task.deadline) return null;
  if (today > task.deadline) return "past_deadline";
  if (task.effectiveDays > task.deadline - task.windowStart + 1) return "exceeds_window";
  if (cpmEnd > task.deadline) return "dependency_chain";
  return "workload";
}

/** Tous les conflits, par deadline puis ordre de création, et par tâche dans l'ordre des types. */
export function collectConflicts(args: {
  tasks: readonly ActiveTask[];
  scheduled: readonly ScheduledTask[];
  cpm: CpmResult;
  blocked: ReadonlyMap<string, readonly string[]>;
  today: Day;
}): Conflict[] {
  const { cpm, blocked, today } = args;
  const scheduled = new Map(args.scheduled.map((s) => [s.taskId, s]));
  const tasks = [...args.tasks].sort((a, b) => a.deadline - b.deadline || byCreation(a, b));

  const conflicts: Conflict[] = [];
  for (const task of tasks) {
    const ref = { taskId: task.id, groupId: task.groupId };
    if (cpm.cycleMembers.has(task.id)) conflicts.push({ kind: "dependency_cycle", ...ref });
    if (task.assigneeIds.length === 0) conflicts.push({ kind: "unassigned", ...ref });
    const blockedBy = blocked.get(task.id);
    if (blockedBy) conflicts.push({ kind: "blocked_dependency", ...ref, blockedBy });
    const placed = scheduled.get(task.id);
    if (placed) {
      const cause = deadlineCause(task, cpm.earliest.get(task.id)!.end, placed.end, today);
      if (cause) {
        conflicts.push({
          kind: "deadline_missed",
          ...ref,
          end: placed.end,
          deadline: task.deadline,
          daysLate: placed.daysLate,
          cause,
        });
      }
    }
  }
  return conflicts;
}
