import type { Prisma } from "@/generated/prisma/client";
import { planAssignmentRelease, type AssignmentRelease } from "@/lib/group-departure";

// Effet d'un départ sur les tâches (§4.4), partagé par le départ d'un groupe
// et le départ de la promo. S'exécute dans la transaction de l'appelant.

type Tx = Prisma.TransactionClient;

/**
 * Retire les assignations de `userId` dans les groupes donnés : une tâche
 * partagée reste aux autres assignés, une tâche dont il était le seul assigné
 * devient non assignée, et une tâche qui n'a plus plusieurs assignés perd sa
 * réunion (§4.5). Les tâches restent dans le groupe.
 */
export async function releaseAssignments(tx: Tx, userId: string, groupIds: string[]): Promise<AssignmentRelease> {
  if (groupIds.length === 0) return { releasedTaskIds: [], unassignedTaskIds: [], meetingObsoleteTaskIds: [] };
  const tasks = await tx.task.findMany({
    where: { groupId: { in: groupIds }, assignments: { some: { userId } } },
    select: { id: true, assignments: { select: { userId: true } } },
  });
  const plan = planAssignmentRelease(
    tasks.map((t) => ({ id: t.id, assigneeIds: t.assignments.map((a) => a.userId) })),
    userId,
  );
  await tx.taskAssignment.deleteMany({ where: { userId, taskId: { in: plan.releasedTaskIds } } });
  await tx.meeting.deleteMany({ where: { taskId: { in: plan.meetingObsoleteTaskIds } } });
  return plan;
}
