// Règles de départ d'un groupe (§4.3, §4.4). Module pur, sans base de données :
// utilisé par les services de groupe et de promo, et testé unitairement.

export type GroupRoleName = "leader" | "member";

export type DepartureError = "leader_successor_required" | "invalid_successor";

export type DeparturePlan =
  /** Dernier membre : le groupe est supprimé avec ses données (§4.3). */
  | { ok: true; kind: "delete_group" }
  /** Départ simple ; `newLeaderId` est renseigné quand le chef part. */
  | { ok: true; kind: "leave"; newLeaderId: string | null }
  | { ok: false; error: DepartureError };

/**
 * Le successeur doit être un autre membre du groupe. `memberIds` contient tous
 * les membres, partant compris.
 */
export function isValidSuccessor(leaverId: string, memberIds: readonly string[], successorId: string): boolean {
  return successorId !== leaverId && memberIds.includes(successorId);
}

/**
 * Départ d'un membre du groupe :
 * - dernier membre : suppression du groupe ;
 * - chef : successeur obligatoire, membre du groupe, qui devient chef ;
 * - membre : départ simple (le successeur éventuel est ignoré).
 */
export function planGroupDeparture(input: {
  leaverId: string;
  leaverRole: GroupRoleName;
  memberIds: readonly string[];
  successorId?: string | null;
}): DeparturePlan {
  const others = input.memberIds.filter((id) => id !== input.leaverId);
  if (others.length === 0) return { ok: true, kind: "delete_group" };
  if (input.leaverRole !== "leader") return { ok: true, kind: "leave", newLeaderId: null };
  if (!input.successorId) return { ok: false, error: "leader_successor_required" };
  if (!isValidSuccessor(input.leaverId, input.memberIds, input.successorId)) {
    return { ok: false, error: "invalid_successor" };
  }
  return { ok: true, kind: "leave", newLeaderId: input.successorId };
}

export type AssignmentRelease = {
  /** Tâches dont on retire l'assignation du partant. */
  releasedTaskIds: string[];
  /** Tâches dont il était le seul assigné : elles deviennent non assignées. */
  unassignedTaskIds: string[];
  /** Tâches qui n'ont plus plusieurs assignés : plus de réunion (§4.5). */
  meetingObsoleteTaskIds: string[];
};

/**
 * Effet du départ sur les tâches (§4.4) : les tâches partagées restent aux
 * autres assignés, celles dont il était le seul assigné deviennent non
 * assignées. `tasks` liste les tâches avec tous leurs assignés.
 */
export function planAssignmentRelease(
  tasks: readonly { id: string; assigneeIds: readonly string[] }[],
  leaverId: string,
): AssignmentRelease {
  const released: string[] = [];
  const unassigned: string[] = [];
  const obsolete: string[] = [];
  for (const task of tasks) {
    if (!task.assigneeIds.includes(leaverId)) continue;
    released.push(task.id);
    const remaining = new Set(task.assigneeIds.filter((id) => id !== leaverId)).size;
    if (remaining === 0) unassigned.push(task.id);
    if (remaining < 2) obsolete.push(task.id);
  }
  return { releasedTaskIds: released, unassignedTaskIds: unassigned, meetingObsoleteTaskIds: obsolete };
}
