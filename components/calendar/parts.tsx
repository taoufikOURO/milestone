import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDay, formatDayShort } from "@/lib/format";
import type { Person } from "@/lib/services/group";
import {
  calendarRange,
  daySpan,
  type CalendarConflict,
  type CalendarMeeting,
  type CalendarView,
} from "@/lib/services/planning-view";

// Éléments communs au calendrier d'un groupe et à « Mon calendrier ». Seule la
// frise défile horizontalement ; la page, jamais.

export const personName = (p: Person) => `${p.firstName} ${p.lastName}`;
const names = (people: Person[]) => (people.length > 0 ? people.map(personName).join(", ") : "Personne");

const STATUS_LABEL = { todo: "À faire", in_progress: "En cours", done: "Terminée" } as const;

/** Frise : une ligne par tâche planifiée, réunions, deadlines et aujourd'hui. */
export function TaskTimeline({ view, showGroup, label }: { view: CalendarView; showGroup: boolean; label: string }) {
  const range = calendarRange(view);
  if (!range || view.tasks.length === 0) {
    return <p className="text-sm text-text-secondary">Aucune tâche planifiée pour l&apos;instant.</p>;
  }
  const at = (day: number) => daySpan(day, day, range);
  const showToday = view.today >= range.from && view.today <= range.to;

  return (
    <div className="space-y-3">
      <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
        <div className="min-w-[640px] space-y-3 pb-2">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{formatDay(range.from)}</span>
            <span>{formatDay(range.to)}</span>
          </div>
          <ul className="space-y-3">
            {view.tasks.map((t) => {
              const bar = daySpan(t.start, t.end, range);
              const summary = `${t.title} : du ${formatDay(t.start)} au ${formatDay(t.end)}, ${names(t.assignees)}${
                t.meetingDay !== null ? `, réunion le ${formatDay(t.meetingDay)}` : ""
              }${t.daysLate > 0 ? `, ${t.daysLate} j de retard` : ""}`;
              return (
                <li key={t.id}>
                  <p className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate font-medium text-text-primary">{t.title}</span>
                    {showGroup ? <span className="shrink-0 text-xs text-text-secondary">{t.groupName}</span> : null}
                    <span className="truncate text-xs text-text-secondary">· {names(t.assignees)}</span>
                    {t.daysLate > 0 ? (
                      <Badge tone="accent" className="shrink-0">
                        +{t.daysLate} j
                      </Badge>
                    ) : null}
                  </p>
                  <div role="img" aria-label={summary} className="relative mt-1 h-7 rounded-md bg-border-soft/30">
                    {view.groups
                      .filter((g) => g.id === t.groupId)
                      .map((g) => (
                        <span
                          key={g.id}
                          aria-hidden
                          className="absolute inset-y-0 border-r-2 border-dashed border-text-secondary"
                          style={{ left: 0, width: `${at(g.endDay).left + at(g.endDay).width}%` }}
                        />
                      ))}
                    {showToday ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 w-0.5 bg-text-primary"
                        style={{ left: `${at(view.today).left}%` }}
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className={`absolute inset-y-1 rounded ${t.status === "in_progress" ? "bg-accent" : "bg-accent/70"}`}
                      style={{ left: `${bar.left}%`, width: `${bar.width}%`, minWidth: "0.375rem" }}
                    />
                    {t.meetingDay !== null ? (
                      <span
                        aria-hidden
                        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-text-primary"
                        style={{ left: `${at(t.meetingDay).left + at(t.meetingDay).width / 2}%` }}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Légende">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded bg-accent/70" /> Tâche planifiée
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-text-primary" /> Réunion
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-r-2 border-dashed border-text-secondary" /> Deadline
        </li>
        {showToday ? (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-0.5 bg-text-primary" /> Aujourd&apos;hui ({formatDayShort(view.today)})
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Liste des tâches planifiées, lisible sans défilement. */
export function TaskList({ view, showGroup }: { view: CalendarView; showGroup: boolean }) {
  if (view.tasks.length === 0) return null;
  return (
    <ul className="divide-y divide-border-soft">
      {view.tasks.map((t) => (
        <li key={t.id} className="space-y-0.5 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/groupes/${t.groupId}/taches/${t.id}`}
              className="min-w-0 break-words font-medium text-text-primary hover:underline"
            >
              {t.title}
            </Link>
            <Badge>{STATUS_LABEL[t.status]}</Badge>
            {t.daysLate > 0 ? <Badge tone="accent">{t.daysLate} j de retard</Badge> : null}
          </div>
          <p className="text-text-secondary">
            {formatDayShort(t.start)} → {formatDayShort(t.end)}
            {showGroup ? ` · ${t.groupName}` : ""} · {names(t.assignees)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MeetingList({ meetings, showGroup }: { meetings: CalendarMeeting[]; showGroup: boolean }) {
  if (meetings.length === 0) {
    return <p className="text-sm text-text-secondary">Aucune réunion : aucune tâche n&apos;a plusieurs assignés.</p>;
  }
  return (
    <ul className="divide-y divide-border-soft">
      {meetings.map((m) => (
        <li key={m.taskId} className="py-2 text-sm">
          <p className="break-words text-text-primary">
            <span className="font-semibold">{formatDay(m.day)}</span> · {m.taskTitle}
            {showGroup ? <span className="text-text-secondary"> · {m.groupName}</span> : null}
          </p>
          <p className="break-words text-text-secondary">{names(m.attendees)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ConflictList({ conflicts, showGroup }: { conflicts: CalendarConflict[]; showGroup: boolean }) {
  if (conflicts.length === 0) {
    return <p className="text-sm text-text-secondary">Aucun conflit : toutes les deadlines sont tenues.</p>;
  }
  return (
    <ul className="space-y-2">
      {conflicts.map((c) => (
        <li key={c.key} className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{c.title}</Badge>
            <Link
              href={`/groupes/${c.groupId}/taches/${c.taskId}`}
              className="min-w-0 break-words font-medium text-text-primary hover:underline"
            >
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
