import { formatDay } from "@/lib/format";
import { studentAgenda, type Conflict, type Day, type Plan, type ScheduledTask } from "@/lib/planning";
import { meetingsForGroup } from "@/lib/services/meeting";
import type { Person } from "@/lib/services/group";

// Projection du plan de la promo vers les calendriers (§5.2, §5.3). Module
// pur : il reçoit un plan déjà calculé (une seule fois pour toute la promo) et
// les libellés lus en base. Le calendrier d'un groupe ne dépend que du plan et
// du groupe, jamais de l'étudiant qui le regarde : deux membres voient la même
// chose.

export type TaskStatusName = "todo" | "in_progress" | "done";

/** Libellés lus en base par le service, indexés par identifiant. */
export type PlanCatalog = {
  groups: ReadonlyMap<string, { id: string; name: string; startDay: Day; endDay: Day }>;
  tasks: ReadonlyMap<string, { title: string; status: TaskStatusName }>;
  people: ReadonlyMap<string, Person>;
};

export type CalendarGroup = { id: string; name: string; startDay: Day; endDay: Day };

export type CalendarTask = {
  id: string;
  title: string;
  status: TaskStatusName;
  groupId: string;
  groupName: string;
  assignees: Person[];
  /** Bornes incluses. */
  start: Day;
  end: Day;
  deadline: Day;
  daysLate: number;
  /** Jour de réunion (tâche à plusieurs assignés), sinon null. */
  meetingDay: Day | null;
};

export type CalendarMeeting = {
  taskId: string;
  taskTitle: string;
  groupId: string;
  groupName: string;
  day: Day;
  attendees: Person[];
};

export type CalendarConflict = {
  /** Unique dans la vue. */
  key: string;
  taskId: string;
  taskTitle: string;
  groupId: string;
  groupName: string;
  /** Texte lisible, jamais le code brut. */
  title: string;
  detail: string;
};

export type CalendarView = {
  today: Day;
  groups: CalendarGroup[];
  tasks: CalendarTask[];
  meetings: CalendarMeeting[];
  conflicts: CalendarConflict[];
};

export type GroupCalendarView = CalendarView & { group: CalendarGroup };

const plural = (n: number) => (n > 1 ? "s" : "");

/** Titre et explication d'un conflit, par cause. */
export function describeConflict(conflict: Conflict, titleOf: (taskId: string) => string): { title: string; detail: string } {
  switch (conflict.kind) {
    case "unassigned":
      return {
        title: "Tâche non assignée",
        detail: "Personne n'est assigné à cette tâche : elle ne peut pas être planifiée.",
      };
    case "blocked_dependency":
      return {
        title: "Bloquée par une dépendance",
        detail: `Elle attend ${conflict.blockedBy.map((id) => `« ${titleOf(id)} »`).join(", ")}, qui ne peut pas être planifiée.`,
      };
    case "dependency_cycle":
      return {
        title: "Dépendance circulaire",
        detail: "Ses dépendances forment une boucle : elle ne peut pas être planifiée.",
      };
    case "deadline_missed": {
      const late = `Fin prévue le ${formatDay(conflict.end)}, ${conflict.daysLate} jour${plural(conflict.daysLate)} après la deadline du ${formatDay(conflict.deadline)}.`;
      const reasons = {
        past_deadline: "La deadline du groupe est déjà passée.",
        exceeds_window: "La tâche, marge comprise, est plus longue que la période du projet.",
        dependency_chain: "Les tâches dont elle dépend se terminent trop tard pour tenir la deadline.",
        workload: "Ses assignés sont pris par d'autres tâches et ne peuvent pas la finir à temps.",
      } as const;
      return { title: "Deadline non tenue", detail: `${reasons[conflict.cause]} ${late}` };
    }
  }
}

function makeProjector(plan: Plan, catalog: PlanCatalog) {
  const meetingDay = new Map(plan.meetings.map((m) => [m.taskId, m.day]));
  const groupName = (id: string) => catalog.groups.get(id)?.name ?? "Groupe";
  const titleOf = (id: string) => catalog.tasks.get(id)?.title ?? "Tâche";
  const people = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const p = catalog.people.get(id);
      return p ? [p] : [];
    });

  return {
    task: (t: ScheduledTask): CalendarTask => ({
      id: t.taskId,
      title: titleOf(t.taskId),
      status: catalog.tasks.get(t.taskId)?.status ?? "todo",
      groupId: t.groupId,
      groupName: groupName(t.groupId),
      assignees: people(t.assigneeIds),
      start: t.start,
      end: t.end,
      deadline: t.deadline,
      daysLate: t.daysLate,
      meetingDay: meetingDay.get(t.taskId) ?? null,
    }),
    meeting: (m: Plan["meetings"][number]): CalendarMeeting => ({
      taskId: m.taskId,
      taskTitle: titleOf(m.taskId),
      groupId: m.groupId,
      groupName: groupName(m.groupId),
      day: m.day,
      attendees: people(m.attendeeIds),
    }),
    conflict: (c: Conflict, index: number): CalendarConflict => ({
      key: `${c.kind}:${c.taskId}:${index}`,
      taskId: c.taskId,
      taskTitle: titleOf(c.taskId),
      groupId: c.groupId,
      groupName: groupName(c.groupId),
      ...describeConflict(c, titleOf),
    }),
  };
}

/**
 * Calendrier d'un groupe : ses tâches planifiées, leurs assignés, ses
 * réunions, ses conflits et sa deadline. Null si le groupe est absent du
 * catalogue.
 */
export function projectGroupCalendar(
  plan: Plan,
  groupId: string,
  catalog: PlanCatalog,
  today: Day,
): GroupCalendarView | null {
  const group = catalog.groups.get(groupId);
  if (!group) return null;
  const p = makeProjector(plan, catalog);
  return {
    today,
    group,
    groups: [group],
    tasks: plan.scheduled.filter((t) => t.groupId === groupId).map(p.task),
    meetings: meetingsForGroup(plan, groupId).map(p.meeting),
    conflicts: plan.conflicts.filter((c) => c.groupId === groupId).map(p.conflict),
  };
}

/**
 * « Mon calendrier » : les tâches et réunions de l'étudiant dans tous ses
 * groupes, et les conflits de tous ses groupes, y compris ceux qui ne le
 * concernent pas directement (tâches non assignées).
 */
export function projectPersonalCalendar(
  plan: Plan,
  studentId: string,
  memberOfGroupIds: ReadonlySet<string>,
  catalog: PlanCatalog,
  today: Day,
): CalendarView {
  const agenda = studentAgenda(plan, studentId, memberOfGroupIds);
  const p = makeProjector(plan, catalog);
  const groups = [...memberOfGroupIds]
    .flatMap((id) => {
      const g = catalog.groups.get(id);
      return g ? [g] : [];
    })
    .sort((a, b) => a.endDay - b.endDay || a.name.localeCompare(b.name, "fr"));
  return {
    today,
    groups,
    tasks: agenda.tasks.map(p.task),
    meetings: agenda.meetings.map(p.meeting),
    conflicts: agenda.conflicts.map(p.conflict),
  };
}

/** Période affichée : des débuts aux fins des groupes, des tâches et des réunions. */
export function calendarRange(view: CalendarView): { from: Day; to: Day } | null {
  const days = [
    ...view.groups.flatMap((g) => [g.startDay, g.endDay]),
    ...view.tasks.flatMap((t) => [t.start, t.end]),
    ...view.meetings.map((m) => m.day),
  ];
  if (days.length === 0) return null;
  return { from: Math.min(...days), to: Math.max(...days) };
}

/** Position d'un intervalle de jours (bornes incluses) en % de la période. */
export function daySpan(start: Day, end: Day, range: { from: Day; to: Day }): { left: number; width: number } {
  const total = range.to - range.from + 1;
  const from = Math.max(start, range.from);
  const to = Math.min(end, range.to);
  return { left: ((from - range.from) / total) * 100, width: (Math.max(0, to - from + 1) / total) * 100 };
}
