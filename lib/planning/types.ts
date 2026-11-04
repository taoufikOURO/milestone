// Types du moteur de planification (§4.5, §4.6). Les dates sont des numéros
// de jour entiers (dayNumber de lib/domain/timeline.ts) : le service convertit
// les colonnes DATE à l'entrée, le module ne manipule jamais d'objet Date.

/** Jours depuis 1970-01-01 UTC. */
export type Day = number;

export type PlanningStatus = "todo" | "in_progress" | "done";

export type PlanningGroup = {
  id: string;
  startDay: Day;
  /** Deadline des tâches du groupe, jour inclus. */
  endDay: Day;
  /** 0 à 100. */
  marginPercent: number;
};

export type PlanningTask = {
  id: string;
  groupId: string;
  /** Durée saisie, en jours calendaires, ≥ 1. */
  durationDays: number;
  status: PlanningStatus;
  assigneeIds: readonly string[];
  /** Tâches du même groupe, terminées comprises. */
  dependsOnIds: readonly string[];
  /** Epoch en ms, sert seulement à départager. */
  createdAt: number;
};

export type PlanningInput = {
  /** Jour courant, calculé par l'appelant (PLANNING_TIMEZONE). */
  today: Day;
  groups: readonly PlanningGroup[];
  /** Toutes les tâches des groupes, terminées comprises. */
  tasks: readonly PlanningTask[];
};

export type ScheduledTask = {
  taskId: string;
  groupId: string;
  assigneeIds: readonly string[];
  effectiveDays: number;
  /** Début au plus tôt (CPM), sans tenir compte de la charge. */
  earliestStart: Day;
  /** Bornes incluses. */
  start: Day;
  end: Day;
  deadline: Day;
  /** 0 si la deadline est tenue. */
  daysLate: number;
};

export type PlannedMeeting = {
  taskId: string;
  groupId: string;
  day: Day;
  attendeeIds: readonly string[];
};

export type DeadlineCause =
  /** La deadline est déjà passée. */
  | "past_deadline"
  /** La durée effective dépasse la fenêtre du groupe. */
  | "exceeds_window"
  /** La chaîne de dépendances dépasse la deadline, même sans charge. */
  | "dependency_chain"
  /** La charge des assignés repousse la tâche. */
  | "workload";

export type Conflict =
  | {
      kind: "deadline_missed";
      taskId: string;
      groupId: string;
      end: Day;
      deadline: Day;
      daysLate: number;
      cause: DeadlineCause;
    }
  | { kind: "unassigned"; taskId: string; groupId: string }
  | {
      kind: "blocked_dependency";
      taskId: string;
      groupId: string;
      /** Ancêtres non planifiables pour une raison propre (sans assigné, cycle). */
      blockedBy: readonly string[];
    }
  /** Défensif : les cycles sont refusés en amont (lib/services/task.ts). */
  | { kind: "dependency_cycle"; taskId: string; groupId: string };

export type Plan = {
  /** Par jour de début, puis par priorité. */
  scheduled: ScheduledTask[];
  /** Par jour. */
  meetings: PlannedMeeting[];
  /** Par deadline, puis par ordre de création. */
  conflicts: Conflict[];
};

export type StudentAgenda = {
  tasks: ScheduledTask[];
  meetings: PlannedMeeting[];
  /** Conflits de tous les groupes de l'étudiant. */
  conflicts: Conflict[];
};
