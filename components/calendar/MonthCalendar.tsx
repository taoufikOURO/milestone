"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { personName } from "@/components/calendar/parts";
import { Badge } from "@/components/ui/Badge";
import {
  daysInMonth,
  firstDayOfMonth,
  layoutWeek,
  monthOfDay,
  monthWeeks,
  shiftMonth,
  type BlockInput,
  type YearMonth,
} from "@/lib/domain/month-grid";
import { dateOfDay } from "@/lib/domain/timeline";
import { formatDay } from "@/lib/format";
import type { CalendarConflict, CalendarMeeting, CalendarTask, CalendarView } from "@/lib/services/planning-view";

// Calendrier mensuel fait maison (§5.2, §5.3). À partir de md : grille de 7
// colonnes, lundi en premier, une ligne par semaine ; en dessous : une liste par
// jour. Aucune donnée n'est chargée ici : tout vient de la vue déjà projetée.

const STATUS_LABEL = { todo: "À faire", in_progress: "En cours", done: "Terminée" } as const;
const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const LANE_REM = 1.5;
const HEADER_REM = 1.75;

const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const longDayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthLabel = (ym: YearMonth) => monthFormat.format(dateOfDay(firstDayOfMonth(ym)));
const longDay = (day: number) => longDayFormat.format(dateOfDay(day));
const dayOfMonth = (day: number) => dateOfDay(day).getUTCDate();
const taskHref = (groupId: string, taskId: string) => `/groupes/${groupId}/taches/${taskId}`;
const assignees = (t: CalendarTask) => (t.assignees.length > 0 ? t.assignees.map(personName).join(", ") : "Personne");

type DayContent = { tasks: CalendarTask[]; meetings: CalendarMeeting[]; conflicts: CalendarConflict[] };

export function MonthCalendar({ view, showGroup }: { view: CalendarView; showGroup: boolean }) {
  const [ym, setYm] = useState<YearMonth>(() => monthOfDay(view.today));
  const [selected, setSelected] = useState<number | null>(null);

  const first = firstDayOfMonth(ym);
  const last = first + daysInMonth(ym) - 1;
  const weeks = useMemo(() => monthWeeks(ym), [ym]);

  // Un conflit n'a pas de jour propre : il est rattaché au dernier jour de sa
  // tâche planifiée (la fin prévue). Les autres (tâche non planifiable) sont
  // listés à part.
  const { byTask, dated, undated } = useMemo(() => {
    const byTask = new Map(view.tasks.map((t) => [t.id, t]));
    const dated: { day: number; conflict: CalendarConflict }[] = [];
    const undated: CalendarConflict[] = [];
    for (const c of view.conflicts) {
      const task = byTask.get(c.taskId);
      if (task) dated.push({ day: task.end, conflict: c });
      else undated.push(c);
    }
    return { byTask, dated, undated };
  }, [view]);

  const contentOf = (day: number): DayContent => ({
    tasks: view.tasks.filter((t) => t.start <= day && day <= t.end),
    meetings: view.meetings.filter((m) => m.day === day),
    conflicts: dated.filter((d) => d.day === day).map((d) => d.conflict),
  });

  const items = useMemo<BlockInput[]>(
    () => [
      ...view.tasks.map((t) => ({ id: `t:${t.id}`, start: t.start, end: t.end })),
      ...view.meetings.map((m) => ({ id: `m:${m.taskId}`, start: m.day, end: m.day })),
    ],
    [view],
  );
  const taskById = byTask;
  const meetingById = useMemo(() => new Map(view.meetings.map((m) => [`m:${m.taskId}`, m])), [view.meetings]);
  const conflictDays = useMemo(() => new Set(dated.map((d) => d.day)), [dated]);

  const goto = (next: YearMonth) => {
    setYm(next);
    setSelected(null);
  };
  const todayInMonth = view.today >= first && view.today <= last;
  const monthDays = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const busyDays = monthDays.filter((d) => {
    const c = contentOf(d);
    return c.tasks.length + c.meetings.length + c.conflicts.length > 0;
  });
  const selectedContent = selected !== null ? contentOf(selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold capitalize text-text-primary" aria-live="polite">
          {monthLabel(ym)}
        </h3>
        <div className="flex gap-2">
          <NavButton onClick={() => goto(shiftMonth(ym, -1))} label="Mois précédent">
            ←
          </NavButton>
          <NavButton onClick={() => goto(monthOfDay(view.today))} label="Revenir à aujourd'hui" disabled={todayInMonth && selected === null}>
            Aujourd&apos;hui
          </NavButton>
          <NavButton onClick={() => goto(shiftMonth(ym, 1))} label="Mois suivant">
            →
          </NavButton>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Légende">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded bg-accent" /> Tâche
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded bg-text-secondary" /> Réunion
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-accent" /> Conflit
        </li>
      </ul>

      {/* Grille : md et plus */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-border-soft">
          <div className="grid grid-cols-7 border-b border-border-soft bg-border-soft/30 text-center text-xs font-semibold text-text-secondary">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">
                {w}
              </div>
            ))}
          </div>
          {weeks.map((monday) => {
            const blocks = layoutWeek(monday, items);
            const lanes = blocks.reduce((n, b) => Math.max(n, b.lane + 1), 0);
            const minHeight = `${Math.max(5.5, HEADER_REM + lanes * LANE_REM + 0.5)}rem`;
            return (
              <div key={monday} className="relative border-b border-border-soft last:border-b-0">
                <div className="grid grid-cols-7">
                  {Array.from({ length: 7 }, (_, i) => monday + i).map((day) => {
                    const inMonth = day >= first && day <= last;
                    const isToday = day === view.today;
                    const isSelected = day === selected;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelected(isSelected ? null : day)}
                        aria-pressed={isSelected}
                        aria-label={`${longDay(day)}${isToday ? " (aujourd'hui)" : ""}`}
                        style={{ minHeight }}
                        className={`border-l border-border-soft p-1 text-left align-top first:border-l-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent ${
                          day < view.today ? "bg-border-soft/40" : "bg-background"
                        } ${inMonth ? "" : "opacity-50"} ${isSelected ? "outline-2 -outline-offset-2 outline-text-primary" : "hover:bg-border-soft/20"}`}
                      >
                        <span
                          className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday ? "bg-accent text-background" : "text-text-secondary"
                          }`}
                        >
                          {dayOfMonth(day)}
                        </span>
                        {conflictDays.has(day) ? (
                          <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-accent align-middle" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="pointer-events-none absolute inset-0 grid grid-cols-7 gap-y-0.5 px-0.5"
                  style={{ gridTemplateRows: `${HEADER_REM}rem repeat(${Math.max(lanes, 1)}, ${LANE_REM - 0.125}rem)` }}
                >
                  {blocks.map((b) => {
                    const meeting = meetingById.get(b.id);
                    const task = meeting ? undefined : taskById.get(b.id.slice(2));
                    const href = meeting ? taskHref(meeting.groupId, meeting.taskId) : taskHref(task!.groupId, task!.id);
                    const title = meeting ? meeting.taskTitle : task!.title;
                    const label = meeting
                      ? `Réunion, ${title}, le ${formatDay(meeting.day)}`
                      : `${title}, du ${formatDay(task!.start)} au ${formatDay(task!.end)}`;
                    return (
                      <Link
                        key={b.id}
                        href={href}
                        aria-label={label}
                        title={label}
                        style={{ gridColumn: `${b.col + 1} / span ${b.span}`, gridRow: b.lane + 2 }}
                        className={`pointer-events-auto min-w-0 truncate px-1.5 text-xs leading-5 font-medium text-background hover:brightness-90 focus-visible:outline-2 focus-visible:outline-text-primary ${
                          meeting ? "bg-text-secondary" : "bg-accent"
                        } ${b.continuesBefore ? "rounded-l-none" : "rounded-l"} ${b.continuesAfter ? "rounded-r-none" : "rounded-r"}`}
                      >
                        {meeting ? "● " : b.continuesBefore ? "… " : ""}
                        {title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {selected !== null && selectedContent ? (
          <DayPanel day={selected} content={selectedContent} showGroup={showGroup} onClose={() => setSelected(null)} />
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Cliquez sur un jour pour voir tout ce qui y est planifié.</p>
        )}
      </div>

      {/* Liste par jour : sous md */}
      <div className="md:hidden">
        {busyDays.length === 0 ? (
          <p className="text-sm text-text-secondary">Rien de planifié en {monthLabel(ym)}.</p>
        ) : (
          <ol className="space-y-4">
            {busyDays.map((day) => (
              <li key={day}>
                <h4 className={`text-sm font-bold capitalize ${day === view.today ? "text-accent" : "text-text-primary"}`}>
                  {longDay(day)}
                  {day === view.today ? " · aujourd'hui" : ""}
                </h4>
                <DayItems content={contentOf(day)} showGroup={showGroup} day={day} />
              </li>
            ))}
          </ol>
        )}
      </div>

      {undated.length > 0 ? (
        <section className="space-y-2" aria-label="Conflits sans date">
          <h3 className="text-sm font-bold text-text-primary">Conflits sans date</h3>
          <ConflictItems conflicts={undated} showGroup={showGroup} />
        </section>
      ) : null}
    </div>
  );
}

function NavButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded-lg border border-border-soft bg-background px-3 py-1.5 text-sm font-semibold text-text-primary hover:bg-border-soft/30 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function DayPanel({
  day,
  content,
  showGroup,
  onClose,
}: {
  day: number;
  content: DayContent;
  showGroup: boolean;
  onClose: () => void;
}) {
  return (
    <section aria-label={`Planning du ${longDay(day)}`} className="mt-3 space-y-3 rounded-xl border border-border-soft bg-white/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-base font-bold capitalize text-text-primary">{longDay(day)}</h4>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-text-secondary hover:underline">
          Fermer
        </button>
      </div>
      <DayItems content={content} showGroup={showGroup} day={day} />
    </section>
  );
}

function DayItems({ content, showGroup, day }: { content: DayContent; showGroup: boolean; day: number }) {
  const { tasks, meetings, conflicts } = content;
  if (tasks.length + meetings.length + conflicts.length === 0) {
    return <p className="text-sm text-text-secondary">Rien de planifié ce jour-là.</p>;
  }
  return (
    <div className="mt-1 space-y-2">
      <ul className="space-y-1.5">
        {meetings.map((m) => (
          <li key={`m:${m.taskId}`} className="text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <Badge tone="dark">Réunion</Badge>
              <Link href={taskHref(m.groupId, m.taskId)} className="min-w-0 break-words font-medium text-text-primary hover:underline">
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
              <Link href={taskHref(t.groupId, t.id)} className="min-w-0 break-words font-medium text-text-primary hover:underline">
                {t.title}
              </Link>
              <Badge>{STATUS_LABEL[t.status]}</Badge>
              {t.daysLate > 0 ? <Badge tone="accent">{t.daysLate} j de retard</Badge> : null}
            </p>
            <p className="break-words text-text-secondary">
              {formatDay(t.start)} → {formatDay(t.end)}
              {showGroup ? ` · ${t.groupName}` : ""} · {assignees(t)}
              {t.deadline === day ? " · deadline" : ""}
            </p>
          </li>
        ))}
      </ul>
      {conflicts.length > 0 ? <ConflictItems conflicts={conflicts} showGroup={showGroup} /> : null}
    </div>
  );
}

function ConflictItems({ conflicts, showGroup }: { conflicts: CalendarConflict[]; showGroup: boolean }) {
  return (
    <ul className="space-y-2">
      {conflicts.map((c) => (
        <li key={c.key} className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{c.title}</Badge>
            <Link href={taskHref(c.groupId, c.taskId)} className="min-w-0 break-words font-medium text-text-primary hover:underline">
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
