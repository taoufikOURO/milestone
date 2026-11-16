import { KeyRound, ListChecks, Users, type LucideIcon } from "lucide-react";
import { DrawLine, RevealWords, Stagger, StaggerItem } from "./motion";
import { POSTER, SectionLabel } from "./ui";

/* Étapes conformes au CDC §4.2, §4.3 et §4.5. */
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: KeyRound,
    title: "Rejoindre ou créer une promo",
    text: "Le créateur de la promo en devient le délégué et partage son code. Les étudiants la rejoignent avec ce code.",
  },
  {
    icon: Users,
    title: "Créer un groupe et inviter",
    text: "Le créateur du groupe en devient le chef. Il fixe les dates et invite les étudiants de la promo par leur nom d’utilisateur.",
  },
  {
    icon: ListChecks,
    title: "Ajouter les tâches et laisser planifier",
    text: "Durée en jours, assignés, dépendances : Milestone place chaque tâche dans le planning de chaque étudiant.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="comment-ca-marche"
      aria-labelledby="comment-ca-marche-titre"
      className="scroll-mt-24 border-t border-line px-gutter py-section"
    >
      <div className="mx-auto max-w-page">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <SectionLabel index="04">Comment ça marche</SectionLabel>
            <RevealWords
              id="comment-ca-marche-titre"
              className={`${POSTER} mt-6 text-section text-text-primary`}
              lines={[{ text: "Trois étapes," }, { text: "puis le planning" }, { text: "se remplit.", faint: true }]}
            />
          </div>
          <p className="max-w-md leading-relaxed text-text-secondary lg:justify-self-end">
            Pas de tableur à tenir à jour. Chaque groupe décrit son travail, Milestone en tire le planning de chaque
            étudiant.
          </p>
        </div>

        <div className="relative mt-14 sm:mt-20">
          {/* Fil des jalons : vertical sur mobile, horizontal sur grand écran. */}
          <DrawLine vertical className="absolute bottom-0 left-[1.15rem] top-2 w-px bg-border-soft md:hidden" />
          <DrawLine className="absolute inset-x-0 top-[1.15rem] hidden h-px bg-border-soft md:block" />
          <Stagger as="ol" stagger={0.14} delay={0.2} className="relative grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <StaggerItem as="li" key={step.title} className="relative pl-14 md:pl-0">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 flex size-[2.3rem] items-center justify-center md:static"
                >
                  <span className="absolute size-6 rotate-45 rounded-[5px] bg-background ring-1 ring-border-soft" />
                  <span className={`relative size-2.5 rotate-45 rounded-[2px] ${i === 2 ? "bg-accent" : "bg-text-primary"}`} />
                </span>
                <div className="flex items-baseline gap-4 md:mt-8">
                  <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <step.icon aria-hidden className="size-5 text-text-secondary" />
                </div>
                <h3 className="mt-4 text-title font-bold text-text-primary">{step.title}</h3>
                <p className="mt-2.5 max-w-sm leading-relaxed text-text-secondary">{step.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
