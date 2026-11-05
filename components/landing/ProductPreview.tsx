"use client";

import { CalendarRange, Flag, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";

/*
 * Aperçu illustratif du produit, entièrement en CSS. Aucune donnée réelle :
 * libellés génériques, valeurs choisies pour l'illustration.
 */

const DAYS = ["L", "M", "M", "J", "V", "S", "D", "L", "M", "M", "J", "V", "S", "D"];
const TODAY = 6; // colonne (0-indexée) de la ligne « aujourd'hui »
const DEADLINE = 13;

type Row = { label: string; start: number; span: number; tone: "done" | "doing" | "todo" };
const ROWS: Row[] = [
  { label: "Recherche", start: 0, span: 3, tone: "done" },
  { label: "Maquettes", start: 2, span: 4, tone: "done" },
  { label: "Rédaction", start: 5, span: 5, tone: "doing" },
  { label: "Relecture", start: 9, span: 2, tone: "todo" },
  { label: "Soutenance", start: 11, span: 2, tone: "todo" },
];

const TONE: Record<Row["tone"], string> = {
  done: "bg-text-primary",
  doing: "bg-accent shadow-accent",
  todo:
    "border border-dashed border-text-secondary/40 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,#ccc5b9_45%,transparent)_0_4px,transparent_4px_8px)]",
};

function Timeline() {
  const reduce = useReducedMotion();
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <CalendarRange className="size-4" />
          </span>
          <p className="font-display text-sm font-bold text-text-primary sm:text-base">Calendrier du groupe</p>
        </div>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
          2 semaines
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[4.75rem_1fr] gap-x-2 sm:grid-cols-[6rem_1fr] sm:gap-x-3">
        <span />
        <div className="relative grid grid-cols-14 font-mono text-[10px] text-muted">
          {DAYS.map((d, i) => (
            <span key={i} className={`py-1 text-center ${i === TODAY ? "font-bold text-text-primary" : ""}`}>
              {d}
            </span>
          ))}
        </div>

        {ROWS.map((row, i) => (
          <Bar key={row.label} row={row} index={i} reduce={!!reduce} />
        ))}
      </div>
    </div>
  );
}

function Bar({ row, index, reduce }: { row: Row; index: number; reduce: boolean }) {
  const transition = useSafeTransition({ duration: 0.7, ease: EASE_OUT_SOFT, delay: 0.7 + index * 0.11 });
  return (
    <>
      <span className="self-center truncate text-left text-[11px] font-medium text-text-secondary sm:text-xs">
        {row.label}
      </span>
      <div className="relative grid min-h-9 grid-cols-14 items-center">
        {/* Colonnes de fond : week-end teinté, ligne d'aujourd'hui, échéance. */}
        {DAYS.map((_, d) => (
          <span
            key={d}
            className={`h-full border-l border-line/60 ${d === 5 || d === 6 || d === 12 || d === 13 ? "bg-surface" : ""}`}
            style={{ gridColumn: d + 1, gridRow: 1 }}
          />
        ))}
        <span
          className="z-0 h-full w-px justify-self-center bg-text-primary/35"
          style={{ gridColumn: TODAY + 1, gridRow: 1 }}
        />
        <span
          className="z-0 h-full justify-self-end border-r-2 border-dashed border-accent/60"
          style={{ gridColumn: DEADLINE + 1, gridRow: 1 }}
        />
        <motion.div
          className={`relative z-10 h-4 rounded-full sm:h-5 ${TONE[row.tone]}`}
          style={{ gridColumn: `${row.start + 1} / span ${row.span}`, gridRow: 1, originX: 0 }}
          initial={reduce ? false : { scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={transition}
        />
        {row.label === "Rédaction" ? (
          <motion.span
            className="relative z-20 flex size-5 items-center justify-center justify-self-center rounded-full border-2 border-background bg-text-primary text-background"
            style={{ gridColumn: 8, gridRow: 1 }}
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={transition}
            title="Réunion"
          >
            <Users className="size-2.5" />
          </motion.span>
        ) : null}
      </div>
    </>
  );
}

function Progress() {
  const fill = useSafeTransition({ duration: 1.4, ease: EASE_OUT_SOFT, delay: 1.1 });
  const reduce = useReducedMotion();
  const legend = [
    { label: "Terminées", dot: "bg-text-primary" },
    { label: "En cours", dot: "bg-accent" },
    { label: "À faire", dot: "border border-dashed border-text-secondary/50" },
  ];
  return (
    <div className="rounded-card border border-line bg-surface p-4 lg:w-60 lg:shrink-0">
      <p className="font-mono text-eyebrow uppercase text-muted">Avancement</p>
      <div className="mt-3 flex items-end justify-between">
        <p className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
          58<span className="text-xl text-muted"> %</span>
        </p>
        <Flag className="mb-1.5 size-4 text-accent" />
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border-soft/70">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-accent to-accent-strong"
          style={{ originX: 0 }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 0.58 }}
          transition={fill}
        />
      </div>
      <ul className="mt-4 space-y-2 text-xs text-text-secondary">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${l.dot}`} />
            {l.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PromoCard() {
  const groups = [0.8, 0.45, 0.2];
  return (
    <div className="w-56 rounded-card border border-border-soft/80 bg-surface-raised p-4 shadow-float">
      <p className="font-display text-sm font-bold text-text-primary">Calendrier de la promo</p>
      <ul className="mt-3 space-y-2.5">
        {groups.map((g, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-14 font-mono text-[10px] text-muted">Groupe {i + 1}</span>
            <span
              className="relative h-3 flex-1 overflow-hidden rounded-full bg-border-soft/60"
              style={{ marginLeft: `${i * 10}%` }}
            >
              <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${g * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeadlineCard() {
  return (
    <div className="flex items-center gap-3 rounded-card border border-text-primary bg-text-primary py-3 pl-3 pr-4 text-background shadow-float">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
        <Flag className="size-4" />
      </span>
      <div>
        <p className="text-sm font-semibold">Échéance du groupe</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-background/60">Marge de 20 % incluse</p>
      </div>
    </div>
  );
}

function Floating({
  children,
  className,
  rotate,
  delay,
}: {
  children: React.ReactNode;
  className: string;
  rotate: number;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const enter = useSafeTransition({ duration: 0.8, ease: EASE_OUT_SOFT, delay });
  return (
    <motion.div
      aria-hidden
      className={`absolute z-20 hidden md:block ${className}`}
      initial={reduce ? false : { opacity: 0, y: 24, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={enter}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: delay + 0.8 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function ProductPreview() {
  const enter = useSafeTransition({ duration: 0.9, ease: EASE_OUT_SOFT, delay: 0.35 });
  return (
    <figure className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
      <Floating className="-left-6 -top-24 lg:-left-20" rotate={-5} delay={1.2}>
        <PromoCard />
      </Floating>
      <Floating className="-bottom-8 -right-4 lg:-right-12" rotate={4} delay={1.4}>
        <DeadlineCard />
      </Floating>

      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter}
        className="relative rounded-panel border border-border-soft/80 bg-surface-raised p-2 shadow-float"
      >
        <div className="flex flex-col gap-4 rounded-[calc(var(--radius-panel)-0.5rem)] border border-line bg-background p-4 sm:p-6 lg:flex-row lg:gap-6">
          <Timeline />
          <Progress />
        </div>
      </motion.div>
      <figcaption className="mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted">
        Illustration de l’interface · sans données réelles
      </figcaption>
    </figure>
  );
}
