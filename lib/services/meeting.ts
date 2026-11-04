import type { Plan, PlannedMeeting } from "@/lib/planning";

// Réunions (§4.5, décision 10). Elles sont calculées par planPromo à chaque
// lecture, jamais écrites en base en v1 : la table meetings reste vide. Une
// tâche dont les assignés changent a donc sa réunion recalculée au prochain
// calcul du plan. Une tâche à un seul assigné n'en a pas.
//
// Module pur : il extrait les réunions d'un plan déjà calculé. Les droits sont
// vérifiés par l'appelant (lib/services/planning.ts) avant toute projection.

/** Réunion de la tâche, ou null (tâche mono-assignée, non planifiée ou inconnue). */
export function meetingForTask(plan: Plan, taskId: string): PlannedMeeting | null {
  return plan.meetings.find((m) => m.taskId === taskId) ?? null;
}

/** Réunions d'un groupe, par jour. */
export function meetingsForGroup(plan: Plan, groupId: string): PlannedMeeting[] {
  return plan.meetings.filter((m) => m.groupId === groupId);
}

/** Réunions auxquelles l'étudiant participe, limitées à ses groupes, par jour. */
export function meetingsForStudent(
  plan: Plan,
  studentId: string,
  memberOfGroupIds: ReadonlySet<string>,
): PlannedMeeting[] {
  return plan.meetings.filter((m) => memberOfGroupIds.has(m.groupId) && m.attendeeIds.includes(studentId));
}
