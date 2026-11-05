"use client";

import { ChevronLeft, ChevronRight, Flag, MousePointerClick, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DayItems, ConflictItems, longDay, taskHref, type DayContent } from "@/components/calendar/DayItems";
import { MobileMonth } from "@/components/calendar/MobileMonth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  daysInMonth,
  deadlinesByDay,
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
import type { CalendarConflict, CalendarView } from "@/lib/services/planning-view";

// Calendrier mensuel fait maison (§5.2, §5.3). À partir de md : grille de 7
// colonnes, lundi en premier, une ligne par semaine ; en dessous : grille compacte
// avec panneau du bas (MobileMonth). Aucune donnée n'est chargée ici : tout vient de la vue déjà projetée.

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const LANE_REM = 1.5;
const HEADER_REM = 1.75;
const MARKER_REM = 1.25;

const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (ym: YearMonth) => monthFormat.format(dateOfDay(firstDayOfMonth(ym)));
const dayOfMonth = (day: number) => dateOfDay(day).getUTCDate();

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

  const deadlines = useMemo(() => deadlinesByDay(view.groups), [view.groups]);

  const contentOf = (day: number): DayContent => ({
    deadlines: deadlines.get(day) ?? [],
    tasks: view.tasks.filter((t) => t.start <= day && day <= t.end),
    meetings: view.meetings.filter((m) => m.day === day),
    conflicts: dated.filter((d) => d.day === day).map((d) => d.conflict),
  });

  const items = useMemo<BlockInput[]>(
    () => [
      ...view.tasks.map((t) => ({ id: `t:${t.id}`, start: t.start, end: t.end, deadline: t.deadline })),
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
  const selectedContent = selected !== null ? contentOf(selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold capitalize tracking-tight text-text-primary" aria-live="polite">
          {monthLabel(ym)}
        </h3>
        <div className="flex gap-2">
          <NavButton onClick={() => goto(shiftMonth(ym, -1))} label="Mois précédent">
            <ChevronLeft aria-hidden />
          </NavButton>
          <NavButton onClick={() => goto(monthOfDay(view.today))} label="Revenir à aujourd'hui" disabled={todayInMonth && selected === null}>
            Aujourd&apos;hui
          </NavButton>
          <NavButton onClick={() => goto(shiftMonth(ym, 1))} label="Mois suivant">
            <ChevronRight aria-hidden />
          </NavButton>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Légende">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded-full bg-accent" /> Tâche
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded-full bg-text-primary" /> Réunion
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-accent" /> Conflit
        </li>
        <li className="flex items-center gap-1.5">
          <Flag aria-hidden className="size-3.5 text-text-primary" /> Deadline
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-5 rounded-full bg-alert" /> Dépassement
        </li>
      </ul>

      {/* Grille : md et plus */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-card border border-border-soft/80 bg-surface-raised shadow-soft">
          <div className="grid grid-cols-7 border-b border-line bg-surface text-center font-mono text-eyebrow uppercase text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          {weeks.map((monday) => {
            const blocks = layoutWeek(monday, items);
            const lanes = blocks.reduce((n, b) => Math.max(n, b.lane + 1), 0);
            const markers = Math.max(0, ...Array.from({ length: 7 }, (_, i) => deadlines.get(monday + i)?.length ?? 0));
            const minHeight = `${Math.max(5.5, HEADER_REM + lanes * LANE_REM + markers * MARKER_REM + 0.5)}rem`;
            return (
              <div key={monday} className="relative border-b border-line last:border-b-0">
                <div className="grid grid-cols-7">
                  {Array.from({ length: 7 }, (_, i) => monday + i).map((day) => {
                    const inMonth = day >= first && day <= last;
                    const isToday = day === view.today;
                    const isSelected = day === selected;
                    const dayDeadlines = deadlines.get(day) ?? [];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelected(isSelected ? null : day)}
                        aria-pressed={isSelected}
                        aria-label={`${longDay(day)}${isToday ? " (aujourd'hui)" : ""}${dayDeadlines.map((d) => `, deadline ${d.groupName}`).join("")}`}
                        style={{ minHeight }}
                        className={`flex flex-col items-stretch justify-start border-l border-line p-1 text-left transition-colors duration-(--duration-fast) first:border-l-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent ${
                          day < view.today ? "bg-surface" : "bg-surface-raised"
                        } ${inMonth ? "" : "opacity-50"} ${isSelected ? "outline-2 -outline-offset-2 outline-accent" : "hover:bg-accent-soft"}`}
                      >
                        <span className="flex items-center">
                          <span
                            className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                              isToday ? "text-text-primary ring-1 ring-text-primary" : "text-text-secondary"
                            }`}
                          >
                            {dayOfMonth(day)}
                          </span>
                          {conflictDays.has(day) ? (
                            <span aria-hidden className="ml-1 inline-block size-2 rounded-full bg-accent" />
                          ) : null}
                        </span>
                        {dayDeadlines.length > 0 ? (
                          <span className="mt-auto flex min-w-0 flex-col gap-0.5 pt-1">
                            {dayDeadlines.map((d) => (
                              <span
                                key={d.groupId}
                                title={`Deadline de ${d.groupName}`}
                                className="flex min-w-0 items-center gap-1 rounded-sm bg-border-soft/20 px-1 text-[0.6875rem] leading-4 font-semibold text-text-primary"
                              >
                                <Flag aria-hidden className="size-3 shrink-0" />
                                <span className="truncate">{d.groupName}</span>
                              </span>
                            ))}
                          </span>
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
                        style={{
                          gridColumn: `${b.col + 1} / span ${b.span}`,
                          gridRow: b.lane + 2,
                          ...(!meeting && b.normalSpan > 0 && b.normalSpan < b.span
                            ? {
                                backgroundImage: `linear-gradient(to right, var(--color-accent) ${(b.normalSpan / b.span) * 100}%, var(--color-alert) ${(b.normalSpan / b.span) * 100}%)`,
                              }
                            : {}),
                        }}
                        className={`pointer-events-auto flex min-w-0 items-center gap-1 truncate px-2 text-xs leading-5 font-semibold text-background transition-[filter] duration-(--duration-fast) hover:brightness-90 focus-visible:outline-2 focus-visible:outline-text-primary ${
                          meeting ? "bg-text-primary" : b.normalSpan === 0 ? "bg-alert" : "bg-accent"
                        } ${b.continuesBefore ? "rounded-l-none" : "rounded-l-full"} ${b.continuesAfter ? "rounded-r-none" : "rounded-r-full"}`}
                      >
                        {meeting ? <Users aria-hidden className="size-3 shrink-0" /> : null}
                        {b.continuesBefore && !meeting ? <ChevronLeft aria-hidden className="size-3 shrink-0" /> : null}
                        <span className="truncate">{title}</span>
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
          <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <MousePointerClick aria-hidden className="size-4 shrink-0 text-muted" />
            Cliquez sur un jour pour voir tout ce qui y est planifié.
          </p>
        )}
      </div>

      {/* Grille compacte : sous md */}
      <div className="md:hidden">
        <MobileMonth ym={ym} today={view.today} contentOf={contentOf} conflictDays={conflictDays} showGroup={showGroup} />
      </div>

      {undated.length > 0 ? (
        <section className="space-y-2" aria-label="Conflits sans date">
          <h3 className="font-display text-sm font-bold text-text-primary">Conflits sans date</h3>
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
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="min-h-11 px-3 py-1.5 text-sm md:min-h-9"
    >
      {children}
    </Button>
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
    <Card tone="muted" role="region" aria-label={`Planning du ${longDay(day)}`} className="mt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-lg font-bold capitalize text-text-primary">{longDay(day)}</h4>
        <Button variant="ghost" onClick={onClose} className="min-h-9 px-3 py-1.5 text-sm">
          <X aria-hidden />
          Fermer
        </Button>
      </div>
      <DayItems content={content} showGroup={showGroup} day={day} />
    </Card>
  );
}

