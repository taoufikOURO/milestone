"use client";

import { CalendarRange, KeyRound, Users, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { EASE_OUT_SOFT, Reveal, useSafeTransition } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: KeyRound,
    title: "Créer ou rejoindre une promo",
    text: "Le créateur de la promo en devient le délégué et partage son code. Les étudiants la rejoignent avec ce code.",
  },
  {
    icon: Users,
    title: "Former ses groupes",
    text: "Chaque groupe fixe ses dates de début et de fin. Son créateur en devient le chef et invite les étudiants de la promo.",
  },
  {
    icon: CalendarRange,
    title: "Planifier les tâches",
    text: "Ajoutez les tâches, leur durée en jours et leurs dépendances : Milestone les place dans le calendrier.",
  },
];

export function HowItWorks() {
  const draw = useSafeTransition({ duration: 1.2, ease: EASE_OUT_SOFT, delay: 0.2 });
  return (
    <section
      id="comment-ca-marche"
      aria-labelledby="comment-ca-marche-titre"
      className="scroll-mt-24 px-gutter py-section"
    >
      <div className="mx-auto max-w-page">
        <SectionHeading
          id="comment-ca-marche-titre"
          eyebrow="Comment ça marche"
          title="Trois étapes, puis le calendrier se remplit."
          intro="Pas de tableur à maintenir : chaque groupe décrit son travail, Milestone en tire un planning cohérent pour toute la promo."
        />

        <div className="relative mt-14 sm:mt-20">
          {/* Fil du temps reliant les jalons (horizontal sur grand écran, vertical sur mobile). */}
          <motion.span
            aria-hidden
            className="absolute left-5 top-5 bottom-5 w-px origin-top bg-border-soft md:inset-x-5 md:bottom-auto md:h-px md:w-auto md:origin-left"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: "0px 0px -20% 0px" }}
            transition={draw}
          />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={0.15 + i * 0.12} className="relative pl-16 md:pl-0">
                <span className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-full border border-border-soft bg-background text-text-primary shadow-soft md:static">
                  <step.icon className="size-[18px]" aria-hidden />
                </span>
                <p className="font-mono text-eyebrow uppercase text-muted md:mt-7">
                  Étape {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-title font-bold text-text-primary">{step.title}</h3>
                <p className="mt-2.5 max-w-sm leading-relaxed text-text-secondary">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
