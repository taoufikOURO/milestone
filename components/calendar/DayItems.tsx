import { CalendarX2, Flag, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { personName } from "@/components/calendar/parts";
import { Badge } from "@/components/ui/Badge";
import type { DeadlineMarker } from "@/lib/domain/month-grid";
import { dateOfDay } from "@/lib/domain/timeline";
import { formatDay } from "@/lib/format";
import type { CalendarConflict, CalendarMeeting, CalendarTask } from "@/lib/services/planning-view";

// Contenu d'une journée du calendrier mensuel : partagé par le panneau du web
// et par le panneau du bas de la grille compacte (mobile), pour des textes identiques.

const STATUS_LABEL = { todo: "À faire", in_progress: "En cours", done: "Terminée" } as const;

const longDayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const longDay = (day: number) => longDayFormat.format(dateOfDay(day));
export const taskHref = (groupId: string, taskId: string) => `/groupes/${groupId}/taches/${taskId}`;
const assignees = (t: CalendarTask) => (t.assignees.length > 0 ? t.assignees.map(personName).join(", ") : "Personne");

export type DayContent = {
  tasks: CalendarTask[];
  meetings: CalendarMeeting[];
  conflicts: CalendarConflict[];
  deadlines: DeadlineMarker[];
};

export function DayItems({ content, showGroup, day }: { content: DayContent; showGroup: boolean; day: number }) {
  const { tasks, meetings, conflicts, deadlines } = content;
  if (tasks.length + meetings.length + conflicts.length + deadlines.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <CalendarX2 aria-hidden className="size-4 shrink-0 text-muted" />
        Rien de planifié ce jour-là.
      </p>
    );
  }
  return (
    <div className="mt-1 space-y-2">
      <ul className="space-y-1.5">
        {deadlines.map((d) => (
          <li key={`d:${d.groupId}`} className="text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-border-soft/20 px-2.5 py-0.5 text-xs leading-5 font-semibold text-text-primary">
                <Flag aria-hidden className="size-3.5" />
                Deadline
              </span>
              <span className="min-w-0 break-words font-semibold text-text-primary">{d.groupName}</span>
            </p>
          </li>
        ))}
        {meetings.map((m) => (
          <li key={`m:${m.taskId}`} className="text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <Badge tone="dark">
                <Users aria-hidden />
                Réunion
              </Badge>
              <Link href={taskHref(m.groupId, m.taskId)} className="min-w-0 break-words font-semibold text-text-primary hover:text-accent-strong">
                {m.taskTitle}
              </Link>
              {showGroup ? <span className="text-xs text-text-secondary">{m.groupName}</span> : null}
            </p>
            <p className="break-words text-text-secondary">{m.attendees.map(personName).join(", ")}</p>
          </li>
        ))}
        {tasks.map((t) => (
          <li key={`t:${t.id}`} className="text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <Link href={taskHref(t.groupId, t.id)} className="min-w-0 break-words font-semibold text-text-primary hover:text-accent-strong">
                {t.title}
              </Link>
              <Badge>{STATUS_LABEL[t.status]}</Badge>
              {t.daysLate > 0 ? <Badge tone="alert">{t.daysLate} j de retard</Badge> : null}
              {day > t.deadline ? <Badge tone="alert">Après la deadline</Badge> : null}
            </p>
            <p className="break-words text-text-secondary">
              {formatDay(t.start)} → {formatDay(t.end)}
              {showGroup ? ` · ${t.groupName}` : ""} · {assignees(t)}
            </p>
          </li>
        ))}
      </ul>
      {conflicts.length > 0 ? <ConflictItems conflicts={conflicts} showGroup={showGroup} /> : null}
    </div>
  );
}

export function ConflictItems({ conflicts, showGroup }: { conflicts: CalendarConflict[]; showGroup: boolean }) {
  return (
    <ul className="space-y-2">
      {conflicts.map((c) => (
        <li key={c.key} className="rounded-card border border-accent/30 bg-accent-soft p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              <TriangleAlert aria-hidden />
              {c.title}
            </Badge>
            <Link href={taskHref(c.groupId, c.taskId)} className="min-w-0 break-words font-semibold text-text-primary hover:text-accent-strong">
              {c.taskTitle}
            </Link>
            {showGroup ? <span className="text-xs text-text-secondary">{c.groupName}</span> : null}
          </p>
          <p className="mt-1 break-words text-text-secondary">{c.detail}</p>
        </li>
      ))}
    </ul>
  );
}
