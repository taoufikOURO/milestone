import { CalendarRange, Gauge, GitBranch, WandSparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

/* Illustrations en CSS, purement décoratives (aria-hidden), sans données réelles. */

function PlanningArt() {
  const lanes = [
    [{ s: 0, w: 3, t: "ink" }, { s: 3, w: 2, t: "accent" }, { s: 5, w: 1, t: "margin" }],
    [{ s: 1, w: 2, t: "accent" }, { s: 3, w: 1, t: "margin" }, { s: 5, w: 3, t: "ink" }],
    [{ s: 0, w: 2, t: "ink" }, { s: 2, w: 4, t: "accent" }, { s: 6, w: 1, t: "margin" }],
  ];
  const tone: Record<string, string> = {
    ink: "bg-text-primary",
    accent: "bg-accent",
    margin:
      "bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,#eb5e28_55%,transparent)_0_3px,transparent_3px_6px)]",
  };
  return (
    <div className="space-y-2.5">
      {lanes.map((lane, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="size-6 shrink-0 rounded-full border border-border-soft bg-surface" />
          <div className="grid h-5 flex-1 grid-cols-8 gap-1">
            {lane.map((b, j) => (
              <span
                key={j}
                className={`rounded-md ${tone[b.t]}`}
                style={{ gridColumn: `${b.s + 1} / span ${b.w}` }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent" /> Tâche
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[repeating-linear-gradient(135deg,#eb5e28_0_2px,transparent_2px_4px)]" />{" "}
          Marge
        </span>
      </div>
    </div>
  );
}

function PromoArt() {
  const bars = [
    { offset: 0, width: 70, fill: 75 },
    { offset: 15, width: 60, fill: 40 },
    { offset: 30, width: 65, fill: 15 },
  ];
  return (
    <div className="space-y-3">
      {bars.map((b, i) => (
        <div key={i} className="relative h-4">
          <span
            className="absolute inset-y-0 overflow-hidden rounded-full bg-border-soft/60"
            style={{ left: `${b.offset}%`, width: `${b.width}%` }}
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${b.fill}%` }} />
          </span>
          <span
            className="absolute top-1/2 size-2 -translate-y-1/2 rotate-45 bg-text-primary"
            style={{ left: `calc(${b.offset + b.width}% + 6px)` }}
          />
        </div>
      ))}
    </div>
  );
}

function ProgressArt() {
  // Avancement au prorata des jours : chaque segment a la largeur de sa durée.
  const segments = [
    { w: 3, done: true },
    { w: 1, done: true },
    { w: 2, done: false },
    { w: 4, done: false },
  ];
  return (
    <div>
      <div className="flex h-3 gap-1">
        {segments.map((s, i) => (
          <span
            key={i}
            className={`rounded-full ${s.done ? "bg-accent" : "bg-border-soft/70"}`}
            style={{ flexGrow: s.w }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1 font-mono text-[10px] text-muted">
        {segments.map((s, i) => (
          <span key={i} style={{ flexGrow: s.w }}>
            {s.w} j
          </span>
        ))}
      </div>
    </div>
  );
}

function DependencyArt() {
  const node =
    "absolute flex h-8 items-center rounded-lg border px-3 font-mono text-[10px] uppercase tracking-wider";
  return (
    <div className="relative h-36">
      <svg className="absolute inset-0 size-full text-border-soft" viewBox="0 0 400 144" preserveAspectRatio="none">
        <path d="M70 72 C 120 72, 120 28, 170 28" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M70 72 C 120 72, 120 116, 170 116" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M230 28 C 280 28, 280 72, 320 72" fill="none" stroke="#eb5e28" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M230 116 C 280 116, 280 72, 320 72" fill="none" stroke="#eb5e28" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      <span className={`${node} left-0 top-1/2 -translate-y-1/2 border-text-primary bg-text-primary text-background`}>
        Tâche A
      </span>
      <span className={`${node} left-[42%] top-0 border-border-soft bg-surface-raised text-text-secondary`}>
        Tâche B
      </span>
      <span className={`${node} bottom-0 left-[42%] border-border-soft bg-surface-raised text-text-secondary`}>
        Tâche C
      </span>
      <span className={`${node} right-0 top-1/2 -translate-y-1/2 border-accent/40 bg-accent-soft text-accent-strong`}>
        Tâche D
      </span>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; text: string; art: ReactNode; span: string }[] = [
  {
    icon: WandSparkles,
    title: "Planification automatique",
    text: "Milestone ordonne les tâches de chaque étudiant, tous groupes confondus : l’échéance la plus proche passe en premier, la charge est répartie, et une marge de sécurité réglable s’ajoute à chaque durée.",
    art: <PlanningArt />,
    span: "md:col-span-4",
  },
  {
    icon: CalendarRange,
    title: "Calendrier de promo",
    text: "Chaque groupe est une barre, de son début à sa fin, remplie selon son avancement.",
    art: <PromoArt />,
    span: "md:col-span-2",
  },
  {
    icon: Gauge,
    title: "Suivi d’avancement",
    text: "L’avancement se calcule au prorata des jours des tâches terminées. Les conflits sont signalés au calendrier.",
    art: <ProgressArt />,
    span: "md:col-span-2",
  },
  {
    icon: GitBranch,
    title: "Gestion des dépendances",
    text: "Une tâche n’est planifiée qu’une fois ses dépendances terminées. Les dépendances circulaires sont refusées.",
    art: <DependencyArt />,
    span: "md:col-span-4",
  },
];

export function Features() {
  return (
    <section
      id="fonctionnalites"
      aria-labelledby="fonctionnalites-titre"
      className="scroll-mt-24 border-y border-line bg-surface/60 px-gutter py-section"
    >
      <div className="mx-auto max-w-page">
        <SectionHeading
          id="fonctionnalites-titre"
          eyebrow="Fonctionnalités"
          title="Un planning qui tient compte de tout le monde."
          intro="Un étudiant fait partie de plusieurs groupes. Milestone le sait, et planifie en conséquence."
        />
        <ul className="mt-14 grid gap-4 sm:mt-16 md:grid-cols-6 md:gap-5">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.title} delay={(i % 2) * 0.1} className={f.span}>
              <article className="group flex h-full flex-col rounded-panel border border-border-soft/80 bg-surface-raised p-6 shadow-soft transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-out-soft hover:border-border-soft hover:shadow-raised motion-safe:hover:-translate-y-1 sm:p-7">
                <div aria-hidden className="mb-8 rounded-card border border-line bg-background p-5">
                  {f.art}
                </div>
                <div className="mt-auto flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-text-primary text-background transition-colors duration-(--duration-base) group-hover:bg-accent">
                    <f.icon className="size-[18px]" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-title font-bold text-text-primary">{f.title}</h3>
                    <p className="mt-2 leading-relaxed text-text-secondary">{f.text}</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
