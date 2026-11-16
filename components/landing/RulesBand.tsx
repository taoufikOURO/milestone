import { ArrowRight, Plus } from "lucide-react";
import { RevealWords, Stagger, StaggerItem } from "./motion";
import { ARROW, POSTER, SectionLabel } from "./ui";

/* Règles réelles de planification (CDC §4.5, §4.6, décisions 14, 16 et 19). */
const RULES = [
  { value: "1 tâche par jour", text: "Un étudiant fait au plus une tâche par jour. Les autres attendent leur tour." },
  { value: "Échéance d’abord", text: "La tâche dont la deadline est la plus proche passe en premier." },
  { value: "1 à 1000 jours", text: "Durée d’une tâche, en jours entiers, cours inclus." },
  { value: "Marge de 0 à 100 %", text: "Réglée par le chef du groupe, 20 % par défaut, ajoutée à chaque durée." },
];

/* Illustration : trois étudiants, quatorze jours, une case par jour au plus. */
const LANES = [
  "AABACCB.BBAC.C",
  "BBB.AACCA.ABBA",
  "CAACB.BAAC.CBB",
];
const CELL: Record<string, string> = {
  A: "bg-accent",
  B: "bg-background/85",
  C: "bg-border-soft/45",
  ".": "border border-dashed border-background/20",
};

function StudentPlanning() {
  return (
    <figure className="relative">
      <div
        role="img"
        aria-label="Illustration : le planning de trois étudiants sur quatorze jours. Chaque jour contient au plus une tâche, issue de l’un de leurs trois groupes."
        className="relative rounded-card border border-background/12 bg-background/[0.03] p-5 sm:p-6"
      >
        <Plus aria-hidden className="absolute -left-2 -top-2 size-4 text-accent" />
        <Plus aria-hidden className="absolute -bottom-2 -right-2 size-4 text-background/50" />
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-background/70">
          <span>Planning par étudiant</span>
          <span>J1 → J14</span>
        </div>
        <div className="mt-5 space-y-3">
          {LANES.map((lane, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-7 shrink-0 font-mono text-[10px] text-background/70">É{i + 1}</span>
              <div className="grid flex-1 grid-cols-14 gap-1">
                {lane.split("").map((c, d) => (
                  <span key={d} className={`h-6 rounded-[5px] sm:h-7 ${CELL[c]}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Repère technique : pointillés et annotation sur une journée. */}
        <div className="mt-5 flex items-center gap-3 border-t border-dashed border-background/20 pt-4 font-mono text-[10px] uppercase tracking-wider text-background/70">
          <span className="size-2 rotate-45 bg-accent" />
          Une case = un jour = une tâche au plus
        </div>
      </div>
      <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-background/70">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent" /> Groupe A
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-background/85" /> Groupe B
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-border-soft/45" /> Groupe C
        </span>
      </figcaption>
    </figure>
  );
}

export function RulesBand() {
  return (
    <section aria-labelledby="regles-titre" className="px-gutter pt-14">
      <div className="relative mx-auto max-w-[88rem]">
        {/* Onglet découpé au-dessus de la bande, avec congé concave. */}
        <div className="absolute -top-11 left-0 flex h-11 items-center rounded-t-[1.25rem] bg-text-primary pl-6 pr-6 sm:pl-10">
          <SectionLabel index="02" tone="dark">
            Règles de planification
          </SectionLabel>
          <span
            aria-hidden
            className="absolute -right-5 bottom-0 size-5 bg-[radial-gradient(circle_at_100%_0,transparent_1.25rem,#252422_calc(1.25rem+0.5px))]"
          />
        </div>

        <div className="grid gap-12 rounded-b-[2rem] rounded-tr-[2rem] bg-text-primary px-6 py-12 text-background sm:px-10 sm:py-16 lg:grid-cols-[1fr_1.15fr_0.95fr] lg:gap-10 lg:py-20">
          <div className="flex flex-col">
            <RevealWords
              id="regles-titre"
              className={`${POSTER} text-section text-background`}
              faintClass="text-border-soft"
              lines={[{ text: "Planifié" }, { text: "par étudiant," }, { text: "pas par groupe.", faint: true }]}
            />
            <p className="mt-6 max-w-sm leading-relaxed text-background/80">
              Un étudiant fait partie de plusieurs groupes. Milestone place les tâches de tous ses groupes dans
              un seul planning, avec ces règles.
            </p>
            <a
              href="#comment-ca-marche"
              className="group mt-8 inline-flex w-fit items-center gap-2 rounded-sm font-semibold text-background underline decoration-accent decoration-2 underline-offset-[6px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Voir comment ça marche
              <ArrowRight aria-hidden className={`${ARROW} text-accent`} />
            </a>
          </div>

          <StudentPlanning />

          <Stagger as="ul" className="divide-y divide-background/15 border-y border-background/15 lg:border-t-0">
            {RULES.map((r) => (
              <StaggerItem as="li" key={r.value} className="py-5 first:lg:pt-0">
                <p className="font-display text-2xl font-bold tracking-tight text-background">{r.value}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-background/75">{r.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
