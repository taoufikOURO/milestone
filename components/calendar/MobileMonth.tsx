"use client";

import { Flag, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DayItems, longDay, type DayContent } from "@/components/calendar/DayItems";
import { Button } from "@/components/ui/Button";
import {
  dayDots,
  daysInMonth,
  firstDayOfMonth,
  monthWeeks,
  type DotKind,
  type YearMonth,
} from "@/lib/domain/month-grid";
import { dateOfDay } from "@/lib/domain/timeline";

// Grille mois compacte (sous md, §5.2, §5.3) : 7 colonnes, lundi en premier,
// numéro du jour et pastilles ; le détail d'un jour s'ouvre dans un panneau du
// bas. Le découpage en semaines et la répartition des pastilles viennent de
// lib/domain/month-grid ; le contenu d'un jour est celui du calendrier web.

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const dayOfMonth = (day: number) => dateOfDay(day).getUTCDate();
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

function dayLabel(c: DayContent, overdue: number) {
  const parts = [
    c.tasks.length > 0 ? plural(c.tasks.length, "tâche") : "",
    overdue > 0 ? `dont ${overdue} après la deadline` : "",
    c.meetings.length > 0 ? plural(c.meetings.length, "réunion") : "",
    ...c.deadlines.map((d) => `deadline ${d.groupName}`),
    c.conflicts.length > 0 ? plural(c.conflicts.length, "conflit") : "",
  ];
  return parts.filter(Boolean).join(", ");
}

function Dot({ kind }: { kind: DotKind }) {
  if (kind === "deadline") return <Flag aria-hidden className="size-2.5 shrink-0 text-text-primary" />;
  const color = kind === "task" ? "bg-accent" : kind === "meeting" ? "bg-text-primary" : "bg-alert";
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${color}`} />;
}

export function MobileMonth({
  ym,
  today,
  contentOf,
  conflictDays,
  showGroup,
}: {
  ym: YearMonth;
  today: number;
  contentOf: (day: number) => DayContent;
  conflictDays: ReadonlySet<number>;
  showGroup: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const first = firstDayOfMonth(ym);
  const last = first + daysInMonth(ym) - 1;
  const weeks = useMemo(() => monthWeeks(ym), [ym]);

  const close = () => {
    setSelected(null);
    trigger.current?.focus();
  };

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-border-soft/80 bg-surface-raised">
        <div className="grid grid-cols-7 border-b border-line bg-surface text-center font-mono text-eyebrow uppercase text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="min-w-0 py-1.5">
              {w}
            </div>
          ))}
        </div>
        {weeks.map((monday) => (
          <div key={monday} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {Array.from({ length: 7 }, (_, i) => monday + i).map((day) => {
              const content = contentOf(day);
              const { dots, more } = dayDots(day, {
                tasks: content.tasks,
                meetings: content.meetings.length,
                deadlines: content.deadlines.length,
              });
              const overdue = content.tasks.filter((t) => day > t.deadline).length;
              const isToday = day === today;
              const summary = dayLabel(content, overdue);
              return (
                <button
                  key={day}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`${longDay(day)}${isToday ? " (aujourd'hui)" : ""}${summary ? `, ${summary}` : ""}`}
                  onClick={(e) => {
                    trigger.current = e.currentTarget;
                    setSelected(day);
                  }}
                  className={`flex min-h-14 min-w-0 flex-col items-center gap-0.5 border-l border-line px-0.5 py-1.5 first:border-l-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                    day < today ? "bg-surface" : "bg-surface-raised"
                  } ${day >= first && day <= last ? "" : "opacity-50"}`}
                >
                  <span className="relative inline-flex">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? "text-text-primary ring-1 ring-text-primary" : "text-text-secondary"
                      }`}
                    >
                      {dayOfMonth(day)}
                    </span>
                    {conflictDays.has(day) ? (
                      <span aria-hidden className="absolute -right-0.5 top-0 size-1.5 rounded-full bg-accent" />
                    ) : null}
                  </span>
                  <span aria-hidden className="flex min-h-2.5 flex-wrap items-center justify-center gap-0.5">
                    {dots.map((kind, i) => (
                      <Dot key={i} kind={kind} />
                    ))}
                    {more > 0 ? (
                      <span className="text-[0.625rem] leading-none font-semibold text-text-secondary">+ {more}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <DaySheet day={selected} content={selected !== null ? contentOf(selected) : null} showGroup={showGroup} onClose={close} />
    </div>
  );
}

/**
 * Panneau du bas : <dialog> natif en modal (rôle dialog, focus piégé, Échap
 * ferme, focus rendu au jour par `onClose`). Le toucher sur le fond ferme.
 * L'animation est coupée par « réduire les animations » (globals.css).
 */
function DaySheet({
  day,
  content,
  showGroup,
  onClose,
}: {
  day: number | null;
  content: DayContent | null;
  showGroup: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = day !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-panel border border-border-soft bg-background p-4 text-text-primary shadow-float backdrop:bg-text-primary/45"
    >
      {day !== null && content ? (
        <div className="space-y-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between gap-2">
            <h4 id={titleId} className="font-display text-lg font-bold capitalize text-text-primary">
              {longDay(day)}
            </h4>
            <Button variant="ghost" onClick={onClose} className="min-h-11 px-3 py-1.5 text-sm">
              <X aria-hidden />
              Fermer
            </Button>
          </div>
          <DayItems content={content} showGroup={showGroup} day={day} />
        </div>
      ) : null}
    </dialog>
  );
}
