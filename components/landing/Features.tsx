import { ArrowRight, CalendarRange, Plus, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RevealWords, Stagger, StaggerItem } from "./motion";
import { ARROW, BTN_OUTLINE, POSTER, SectionLabel } from "./ui";

/* Illustrations rognées en bas de carte : décoratives, le texte porte le sens. */

function PromoArt() {
  const bars = [
    { left: 0, width: 72, fill: 70 },
    { left: 18, width: 64, fill: 40 },
    { left: 34, width: 66, fill: 15 },
  ];
  return (
    <div className="space-y-3">
      {bars.map((b, i) => (
        <span
          key={i}
          className="relative block h-4 overflow-hidden rounded-full bg-border-soft/60"
          style={{ marginLeft: `${b.left}%`, width: `${b.width}%` }}
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${b.fill}%` }} />
        </span>
      ))}
    </div>
  );
}

function PlanningArt() {
  const days = ["A", "A", "B", "A", "C", "B", "B"];
  const tone: Record<string, string> = { A: "bg-accent", B: "bg-text-primary", C: "bg-border-soft" };
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 font-mono text-[9px] text-text-secondary">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {days.map((g, i) => (
          <span key={i} className={`h-12 rounded-md ${tone[g]}`} />
        ))}
      </div>
    </div>
  );
}

function ConflictArt() {
  return (
    <div className="relative h-20">
      <span className="absolute inset-y-0 left-[62%] border-l-2 border-dashed border-text-primary/60" />
      <span className="absolute -top-1 left-[62%] flex -translate-x-1/2 items-center rounded-full bg-text-primary px-2 py-0.5 font-mono text-[9px] uppercase text-background">
        Deadline
      </span>
      <span className="absolute left-[8%] top-9 h-4 w-[44%] rounded-full bg-border-soft" />
      <span className="absolute left-[30%] top-14 h-4 w-[48%] rounded-full bg-text-primary" />
      <span className="absolute left-[78%] top-[3.25rem] flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-text-primary">
        <TriangleAlert className="size-3.5" />
      </span>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; text: string; art: ReactNode }[] = [
  {
    icon: CalendarRange,
    title: "Calendrier de promo",
    text: "Chaque groupe est une barre, de sa date de début à sa date de fin, remplie selon son avancement.",
    art: <PromoArt />,
  },
  {
    icon: UserRound,
    title: "Planning par étudiant",
    text: "Les tâches de tous vos groupes sur un seul calendrier, une par jour, dans l’ordre des deadlines.",
    art: <PlanningArt />,
  },
  {
    icon: TriangleAlert,
    title: "Conflits de deadline repérés",
    text: "Une deadline qui ne peut pas être tenue est signalée au dernier jour de la tâche concernée.",
    art: <ConflictArt />,
  },
];

export function Features() {
  return (
    <section
      id="fonctionnalites"
      aria-labelledby="fonctionnalites-titre"
      className="scroll-mt-24 px-gutter py-section"
    >
      <div className="mx-auto grid max-w-page gap-12 lg:grid-cols-[0.85fr_2fr] lg:gap-10">
        <div className="lg:pt-4">
          <SectionLabel index="03">Fonctionnalités</SectionLabel>
          <RevealWords
            id="fonctionnalites-titre"
            className={`${POSTER} mt-6 text-section text-text-primary`}
            lines={[{ text: "Pensé pour" }, { text: "les deadlines" }, { text: "qui se croisent." }]}
          />
          <p className="mt-6 max-w-sm leading-relaxed text-text-secondary">
            Plusieurs enseignants, plusieurs projets, des dates qui se chevauchent. Milestone met tout à plat,
            pour chaque étudiant.
          </p>
          <Link href="/inscription" className={`${BTN_OUTLINE} mt-8`}>
            Créer une promo
            <ArrowRight aria-hidden className={ARROW} />
          </Link>
        </div>

        <Stagger as="ul" className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <StaggerItem as="li" key={f.title}>
              <article className="group relative flex h-full min-h-[25rem] flex-col overflow-hidden rounded-panel border border-border-soft/80 bg-surface p-5 transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-out-soft hover:border-border-soft hover:shadow-raised motion-safe:hover:-translate-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-secondary">{String(i + 1).padStart(2, "0")}</span>
                  <Plus
                    aria-hidden
                    className="size-5 text-text-primary transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:rotate-90"
                  />
                </div>
                <span className="mt-6 flex size-10 items-center justify-center rounded-control bg-text-primary text-background transition-colors duration-(--duration-base) group-hover:bg-accent group-hover:text-text-primary">
                  <f.icon aria-hidden className="size-[18px]" />
                </span>
                <h3 className="mt-4 text-xl font-bold leading-tight tracking-tight text-text-primary">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.text}</p>
                <span
                  aria-hidden
                  className="mt-5 flex size-9 items-center justify-center rounded-full border border-text-primary/50 text-text-primary transition-colors duration-(--duration-base) group-hover:border-text-primary group-hover:bg-text-primary group-hover:text-background"
                >
                  <ArrowRight className={ARROW} />
                </span>
                {/* Visuel rogné qui déborde du bas de la carte. */}
                <div aria-hidden className="-mx-5 -mb-5 mt-auto pt-6">
                  <div className="translate-y-3 rounded-t-card border-x border-t border-border-soft/80 bg-background px-5 pb-6 pt-5 transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:translate-y-0">
                    {f.art}
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
