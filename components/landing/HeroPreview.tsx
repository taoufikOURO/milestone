"use client";

import { CalendarRange, Flag, Gauge } from "lucide-react";
import { motion, useReducedMotion, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";
import { REDUCE_VISIBLE } from "./ui";

/*
 * Aperçus illustratifs, en CSS. Les valeurs sont fictives mais suivent les
 * règles réelles : barre de groupe remplie selon l'avancement (§5.1),
 * avancement au prorata des jours, tâche en cours comptée 0 % (§4.7),
 * marge du groupe à 20 % par défaut (décision 19).
 */

const WEEKS = 10;
const TODAY = 4; // colonne de la ligne « aujourd'hui »
const GROUPS = [
  { name: "Groupe A", start: 0, span: 6, fill: 0.7 },
  { name: "Groupe B", start: 2, span: 7, fill: 0.4 },
  { name: "Groupe C", start: 1, span: 9, fill: 0.3 },
  { name: "Groupe D", start: 4, span: 5, fill: 0.1 },
];

/** Remplissage : la largeur porte la valeur, l'échelle ne sert qu'à l'entrée. */
function GrowBar({ fill, delay }: { fill: number; delay: number }) {
  const transition = useSafeTransition({ duration: 1.1, ease: EASE_OUT_SOFT, delay });
  return (
    <motion.span
      className={`absolute inset-y-0 left-0 origin-left rounded-full bg-accent ${REDUCE_VISIBLE}`}
      style={{ width: `${fill * 100}%` }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={transition}
    />
  );
}

function PromoCard() {
  return (
    <div className="rounded-panel border border-border-soft/80 bg-surface-raised p-4 shadow-float sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
            <CalendarRange className="size-4" />
          </span>
          <p className="font-display text-sm font-bold text-text-primary sm:text-base">Calendrier de la promo</p>
        </div>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
          4 groupes
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[4.25rem_1fr] gap-x-2 sm:grid-cols-[4.75rem_1fr]">
        <span />
        <div className="grid grid-cols-10 font-mono text-[9px] text-text-secondary">
          {Array.from({ length: WEEKS }, (_, i) => (
            <span key={i} className={`py-1 text-center ${i === TODAY ? "font-bold text-text-primary" : ""}`}>
              S{i + 1}
            </span>
          ))}
        </div>
        {GROUPS.map((g, i) => (
          <div key={g.name} className="contents">
            <span className="self-center font-mono text-[10px] text-text-secondary">{g.name}</span>
            <div className="relative grid h-9 grid-cols-10 items-center">
              {Array.from({ length: WEEKS }, (_, d) => (
                <span
                  key={d}
                  className="h-full border-l border-line/70"
                  style={{ gridColumn: d + 1, gridRow: 1 }}
                />
              ))}
              <span
                className="z-0 h-full w-px justify-self-center border-l border-dashed border-text-primary/40"
                style={{ gridColumn: TODAY + 1, gridRow: 1 }}
              />
              <span
                className="relative z-10 flex h-3.5 items-center"
                style={{ gridColumn: `${g.start + 1} / span ${g.span}`, gridRow: 1 }}
              >
                <span className="relative h-full flex-1 overflow-hidden rounded-full bg-border-soft/60">
                  <GrowBar fill={g.fill} delay={0.8 + i * 0.12} />
                </span>
                <Flag className="ml-1 size-3 shrink-0 text-text-primary" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TASKS = [
  { days: 3, status: "done" },
  { days: 2, status: "done" },
  { days: 4, status: "doing" },
  { days: 1, status: "todo" },
] as const;

const TASK_TONE = {
  done: "bg-accent",
  doing: "bg-text-primary",
  todo: "bg-border-soft/70",
} as const;

function ProgressCard() {
  const total = TASKS.reduce((s, t) => s + t.days, 0);
  const done = TASKS.filter((t) => t.status === "done").reduce((s, t) => s + t.days, 0);
  return (
    <div className="rounded-panel border border-text-primary/10 bg-background p-4 shadow-float sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-text-primary sm:text-base">Groupe A</p>
        <Gauge className="size-4 text-accent-ink" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-4xl font-extrabold leading-none tracking-tight text-text-primary">
          {Math.round((done / total) * 100)}
          <span className="text-xl text-text-secondary"> %</span>
        </p>
        <p className="pb-0.5 text-right font-mono text-[10px] uppercase leading-tight tracking-wider text-text-secondary">
          {done} j terminés
          <br />
          sur {total} j
        </p>
      </div>
      <div className="mt-3 flex h-3 gap-1">
        {TASKS.map((t, i) => (
          <span key={i} className={`rounded-full ${TASK_TONE[t.status]}`} style={{ flexGrow: t.days }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-secondary">
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" /> Terminée
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-text-primary" /> En cours, compte 0 %
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-border-soft" /> À faire
        </li>
      </ul>
      <p className="mt-3 flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
        Marge du groupe <span className="font-bold text-text-primary">20 %</span>
      </p>
    </div>
  );
}

/** Carte inclinée : entrée au chargement, flottement lent, profondeur au défilement. */
function FloatingCard({
  children,
  className,
  tilt,
  delay,
  period,
  depth,
}: {
  children: ReactNode;
  className: string;
  tilt: number;
  delay: number;
  period: number;
  depth?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const enter = useSafeTransition({ duration: 0.9, ease: EASE_OUT_SOFT, delay });
  // Mêmes props au serveur et au client ; REDUCE_VISIBLE annule les transformations.
  return (
    <motion.div className={`absolute ${className}`}>
      <motion.div className={REDUCE_VISIBLE} style={depth ? { y: depth } : undefined}>
        {/* L'inclinaison est statique : elle reste avec « réduire les animations ». */}
        <div style={{ rotate: `${tilt}deg` }}>
          <motion.div
            className={REDUCE_VISIBLE}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enter}
          >
            <motion.div
              className={REDUCE_VISIBLE}
              animate={{ y: [0, -8, 0] }}
              transition={
                reduce ? { duration: 0 } : { duration: period, repeat: Infinity, ease: "easeInOut", delay: delay + 1 }
              }
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HeroPreview({ depthBack, depthFront }: { depthBack: MotionValue<number>; depthFront: MotionValue<number> }) {
  return (
    <div
      role="img"
      aria-label="Aperçu de Milestone : le calendrier de la promo, où chaque groupe est une barre remplie selon son avancement, et la carte d'un groupe avec sa barre d'avancement calculée au prorata des jours."
      className="relative mx-auto h-[27rem] w-full max-w-xl sm:h-[30rem] lg:h-[34rem]"
    >
      <FloatingCard className="right-1.5 top-0 w-[90%] sm:right-0 sm:w-[88%]" tilt={2.5} delay={0.45} period={7} depth={depthBack}>
        <PromoCard />
      </FloatingCard>
      <FloatingCard
        className="bottom-0 left-0 w-[78%] sm:w-[62%] lg:-left-6"
        tilt={-4}
        delay={0.65}
        period={6}
        depth={depthFront}
      >
        <ProgressCard />
      </FloatingCard>
    </div>
  );
}
