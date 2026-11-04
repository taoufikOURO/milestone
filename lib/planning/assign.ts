// Placement des tâches sur les étudiants (§4.6, étape 3). Module pur.

import type { ActiveTask } from "@/lib/planning/cpm";
import type { Day } from "@/lib/planning/types";

/** Étudiant → jour → tâche qui l'occupe. Un étudiant fait au plus une tâche par jour. */
export type Occupancy = Map<string, Map<Day, string>>;

export type Placement = { start: Day; end: Day };

/** Libre ce jour-là, ou occupé seulement par `exceptTaskId`. */
export function isFree(occupancy: Occupancy, studentId: string, day: Day, exceptTaskId?: string): boolean {
  const taskId = occupancy.get(studentId)?.get(day);
  return taskId === undefined || taskId === exceptTaskId;
}

/**
 * Premier jour s ≥ `from` où tous les étudiants sont libres sur
 * [s, s + length − 1], en un bloc contigu. Sur un jour occupé, on repart du
 * lendemain du dernier jour occupé de la fenêtre : aucun début intermédiaire
 * ne peut l'éviter. Termine toujours, l'occupation étant finie.
 */
export function findSlot(occupancy: Occupancy, studentIds: readonly string[], from: Day, length: number): Day {
  let start = from;
  for (;;) {
    let lastBusy: Day | null = null;
    for (let day = start + length - 1; day >= start && lastBusy === null; day--) {
      if (studentIds.some((id) => !isFree(occupancy, id, day))) lastBusy = day;
    }
    if (lastBusy === null) return start;
    start = lastBusy + 1;
  }
}

function reserve(occupancy: Occupancy, studentIds: readonly string[], taskId: string, { start, end }: Placement) {
  for (const id of studentIds) {
    let days = occupancy.get(id);
    if (!days) occupancy.set(id, (days = new Map()));
    for (let day = start; day <= end; day++) days.set(day, taskId);
  }
}

/**
 * Place les tâches dans l'ordre de priorité (topologique), chacune au plus tôt
 * après la fin réelle de ses dépendances, sur un bloc où tous ses assignés
 * sont libres. Une tâche de priorité plus faible peut remplir un trou laissé
 * plus tôt. Une tâche en retard est placée quand même, après sa deadline. Les
 * tâches de `skip` et celles sans assigné ne sont pas placées.
 */
export function placeTasks(
  order: readonly ActiveTask[],
  skip: ReadonlySet<string>,
): { placements: Map<string, Placement>; occupancy: Occupancy } {
  const placements = new Map<string, Placement>();
  const occupancy: Occupancy = new Map();
  for (const task of order) {
    if (skip.has(task.id) || task.assigneeIds.length === 0) continue;
    let earliest = task.windowStart;
    for (const depId of task.dependsOnIds) {
      const dep = placements.get(depId);
      if (!dep) throw new Error(`Dépendance ${depId} non placée avant la tâche ${task.id}.`);
      earliest = Math.max(earliest, dep.end + 1);
    }
    const start = findSlot(occupancy, task.assigneeIds, earliest, task.effectiveDays);
    const placement = { start, end: start + task.effectiveDays - 1 };
    reserve(occupancy, task.assigneeIds, task.id, placement);
    placements.set(task.id, placement);
  }
  return { placements, occupancy };
}
