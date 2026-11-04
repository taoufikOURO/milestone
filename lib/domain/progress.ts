// Avancement d'un groupe (§4.7, décision 2). Module pur.

export type ProgressTask = { durationDays: number; status: "todo" | "in_progress" | "done" };

/**
 * Pourcentage entier : durées (saisies, sans la marge) des tâches terminées
 * divisées par la somme de toutes les durées. Une tâche « en cours » compte
 * pour 0 %. Groupe sans tâche : 0 %.
 */
export function groupProgress(tasks: readonly ProgressTask[]): number {
  let total = 0;
  let done = 0;
  for (const task of tasks) {
    total += task.durationDays;
    if (task.status === "done") done += task.durationDays;
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
