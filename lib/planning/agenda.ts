// Projection du planning de la promo sur un étudiant (§5.3, décisions 1 et 7).
// Module pur.

import type { Plan, StudentAgenda } from "@/lib/planning/types";

/**
 * Tâches et réunions de l'étudiant, limitées à ses groupes (§8), et conflits
 * de tous ses groupes, y compris ceux qui ne le concernent pas directement
 * (tâches non assignées).
 */
export function studentAgenda(plan: Plan, studentId: string, memberOfGroupIds: ReadonlySet<string>): StudentAgenda {
  const mine = (groupId: string, people: readonly string[]) =>
    memberOfGroupIds.has(groupId) && people.includes(studentId);
  return {
    tasks: plan.scheduled.filter((t) => mine(t.groupId, t.assigneeIds)),
    meetings: plan.meetings.filter((m) => mine(m.groupId, m.attendeeIds)),
    conflicts: plan.conflicts.filter((c) => memberOfGroupIds.has(c.groupId)),
  };
}
