// Moteur de planification v1 (§4.6). Un seul calcul pour toute la promo, puis
// une projection par étudiant (studentAgenda). Logique pure, déterministe :
// `today` est fourni par l'appelant, le module n'appelle jamais new Date().

import { placeTasks } from "@/lib/planning/assign";
import { blockedRoots, collectConflicts } from "@/lib/planning/conflicts";
import { computeCpm, prepareTasks } from "@/lib/planning/cpm";
import { planMeetings } from "@/lib/planning/meetings";
import { priorityOrder } from "@/lib/planning/prioritize";
import type { Plan, PlanningInput, ScheduledTask } from "@/lib/planning/types";

export { studentAgenda } from "@/lib/planning/agenda";
export { effectiveDuration } from "@/lib/planning/duration";
export type * from "@/lib/planning/types";

export function planPromo(input: PlanningInput): Plan {
  const tasks = prepareTasks(input);
  const cpm = computeCpm(tasks);
  const blocked = blockedRoots(tasks, cpm.cycleMembers);
  const order = priorityOrder(tasks, cpm.tail);
  const { placements, occupancy } = placeTasks(order, new Set([...cpm.unordered, ...blocked.keys()]));

  const scheduled: ScheduledTask[] = [];
  for (const task of order) {
    const placed = placements.get(task.id);
    if (!placed) continue;
    scheduled.push({
      taskId: task.id,
      groupId: task.groupId,
      assigneeIds: task.assigneeIds,
      effectiveDays: task.effectiveDays,
      earliestStart: cpm.earliest.get(task.id)!.start,
      start: placed.start,
      end: placed.end,
      deadline: task.deadline,
      daysLate: Math.max(0, placed.end - task.deadline),
    });
  }
  // Tri stable : à début égal, l'ordre de priorité est conservé.
  scheduled.sort((a, b) => a.start - b.start);

  return {
    scheduled,
    meetings: planMeetings(scheduled, occupancy),
    conflicts: collectConflicts({ tasks, scheduled, cpm, blocked, today: input.today }),
  };
}
