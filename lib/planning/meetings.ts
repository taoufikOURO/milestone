// Réunions des tâches multi-assignées (§4.5, décision 6). Module pur : calcul
// seulement, aucune écriture en base en v1.

import { isFree, type Occupancy } from "@/lib/planning/assign";
import type { Day, PlannedMeeting, ScheduledTask } from "@/lib/planning/types";

/** Une tâche à une seule personne ne génère pas de réunion. */
export const MIN_MEETING_ATTENDEES = 2;

/**
 * Premier jour de [from, to] où aucun participant n'est occupé par une autre
 * tâche que `ownTaskId` ; null s'il n'y en a pas.
 */
export function firstCommonFreeDay(
  occupancy: Occupancy,
  attendeeIds: readonly string[],
  from: Day,
  to: Day,
  ownTaskId: string,
): Day | null {
  for (let day = from; day <= to; day++) {
    if (attendeeIds.every((id) => isFree(occupancy, id, day, ownTaskId))) return day;
  }
  return null;
}

/**
 * Une réunion par tâche placée à deux assignés ou plus, dans la fenêtre de la
 * tâche. Les assignés y étant occupés ensemble, elle tombe en pratique le
 * premier jour ; à défaut de jour libre, on retient aussi le premier jour.
 */
export function planMeetings(scheduled: readonly ScheduledTask[], occupancy: Occupancy): PlannedMeeting[] {
  return scheduled
    .filter((t) => t.assigneeIds.length >= MIN_MEETING_ATTENDEES)
    .map((t) => ({
      taskId: t.taskId,
      groupId: t.groupId,
      day: firstCommonFreeDay(occupancy, t.assigneeIds, t.start, t.end, t.taskId) ?? t.start,
      attendeeIds: t.assigneeIds,
    }))
    .sort((a, b) => a.day - b.day);
}
