// Ordre de priorité (§4.6, étape 2). Module pur.

import { byCreation, type ActiveTask } from "@/lib/planning/cpm";

/**
 * Tâches en cours d'abord (tête de file de leurs assignés), puis deadline la
 * plus proche, puis tail décroissant, puis ordre de création et identifiant.
 */
export function compareByPriority(a: ActiveTask, b: ActiveTask, tail: ReadonlyMap<string, number>): number {
  const rank = (t: ActiveTask) => (t.status === "in_progress" ? 0 : 1);
  return rank(a) - rank(b) || a.deadline - b.deadline || tail.get(b.id)! - tail.get(a.id)! || byCreation(a, b);
}

/**
 * Tâches ordonnables (présentes dans `tail`), par priorité. L'ordre est
 * topologique : une tâche en cours n'a plus de dépendance, et une dépendance
 * à faire est du même groupe (même deadline) avec un tail strictement plus
 * grand, puisque eff ≥ 1.
 */
export function priorityOrder(tasks: readonly ActiveTask[], tail: ReadonlyMap<string, number>): ActiveTask[] {
  return tasks.filter((t) => tail.has(t.id)).sort((a, b) => compareByPriority(a, b, tail));
}
