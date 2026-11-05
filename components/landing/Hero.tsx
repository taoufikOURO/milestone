"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { DURATION, EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProductPreview } from "./ProductPreview";

function Rise({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  const transition = useSafeTransition({ duration: DURATION.slow * 1.3, ease: EASE_OUT_SOFT, delay });
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const draw = useSafeTransition({ duration: 0.9, ease: EASE_OUT_SOFT, delay: 0.55 });
  return (
    <section className="relative isolate overflow-hidden px-gutter pb-section pt-32 sm:pt-40">
      {/* Feuille de planning en fond, estompée sur les bords. */}
      <div
        aria-hidden
        className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_30%,transparent_80%)]"
      />
      <div className="mx-auto max-w-page text-center">
        <Rise delay={0.05}>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary sm:text-eyebrow sm:tracking-[0.08em]">
            <span aria-hidden className="size-1.5 rotate-45 bg-accent" />
            Projets de groupe, à l’échelle de la promo
          </p>
        </Rise>
        <Rise delay={0.12}>
          <h1 className="mx-auto mt-7 max-w-5xl text-display font-extrabold text-text-primary">
            Chaque groupe sait quoi faire,{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">et pour quand.</span>
              <svg
                aria-hidden
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                className="absolute -bottom-[0.12em] left-0 h-[0.3em] w-full text-accent"
              >
                <motion.path
                  d="M3 14 C 70 4, 160 3, 297 9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={draw}
                />
              </svg>
            </span>
          </h1>
        </Rise>
        <Rise delay={0.2}>
          <p className="mx-auto mt-7 max-w-prose text-base leading-relaxed text-text-secondary sm:text-lg">
            Milestone place les tâches de tous les groupes sur un calendrier commun, en tenant compte
            des dépendances, des échéances et de la charge de chacun.
          </p>
        </Rise>
        <Rise delay={0.28} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/inscription" className="group h-12 w-full rounded-full! px-6 text-base sm:w-auto">
            Créer une promo
            <ArrowRight className="transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:translate-x-0.5" />
          </ButtonLink>
          <ButtonLink
            href="/connexion"
            variant="ghost"
            className="h-12 w-full rounded-full! px-6 text-base sm:w-auto"
          >
            Se connecter
          </ButtonLink>
        </Rise>
      </div>
      <ProductPreview />
    </section>
  );
}
