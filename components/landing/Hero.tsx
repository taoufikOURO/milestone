"use client";

import { ArrowDown, ArrowRight, CalendarRange, Flag, Users } from "lucide-react";
import { useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { HeroPreview } from "./HeroPreview";
import { RevealWords, Stagger, StaggerItem } from "./motion";
import { ARROW, BTN_PRIMARY, FOCUS, POSTER } from "./ui";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  // Profondeur : les deux cartes remontent à des vitesses différentes au défilement.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const depthBack = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const depthFront = useTransform(scrollYProgress, [0, 1], [0, -110]);

  return (
    <section ref={ref} aria-labelledby="hero-titre" className="relative isolate overflow-hidden px-gutter pb-20 pt-28 sm:pb-28 sm:pt-36">
      {/* Fils en diagonale, discrets, derrière les cartes. */}
      <svg aria-hidden className="absolute inset-0 -z-10 hidden size-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="48" y1="100" x2="100" y2="12" stroke="#ccc5b9" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />
        <line x1="62" y1="100" x2="100" y2="40" stroke="#eb5e28" strokeWidth="0.12" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Libellé vertical dans la marge droite. */}
      <div aria-hidden className="absolute right-6 top-40 hidden flex-col items-center gap-3 xl:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary [writing-mode:vertical-rl]">
          Défiler pour voir
        </span>
        <span className="relative h-20 w-px bg-border-soft">
          <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-accent" />
        </span>
      </div>

      <div className="mx-auto grid max-w-page items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <Stagger trigger="load" stagger={0.08} delay={0.05}>
            <StaggerItem>
              <p className="flex items-center gap-3 font-mono text-eyebrow uppercase text-text-secondary">
                Planifier les projets de groupe
                <span aria-hidden className="h-px max-w-24 flex-1 bg-border-soft" />
                <span className="text-accent-ink">/ 01</span>
              </p>
            </StaggerItem>
          </Stagger>

          <RevealWords
            as="h1"
            id="hero-titre"
            trigger="load"
            delay={0.15}
            className={`${POSTER} mt-7 text-poster text-text-primary`}
            lines={[{ text: "Toute la promo" }, { text: "sur un seul" }, { text: "calendrier.", faint: true }]}
          />

          <Stagger trigger="load" stagger={0.08} delay={0.55}>
            <StaggerItem>
              <p className="mt-7 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
                Milestone planifie les projets de groupe par étudiant, sur toute la promotion. Chacun voit ses
                tâches, ses deadlines et l’avancement de ses groupes.
              </p>
            </StaggerItem>
            <StaggerItem className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link href="/inscription" className={BTN_PRIMARY}>
                Créer une promo
                <ArrowRight aria-hidden className={ARROW} />
              </Link>
              <a
                href="#comment-ca-marche"
                className={`group inline-flex min-h-12 items-center justify-center gap-3 rounded-full pr-2 font-semibold text-text-primary sm:justify-start ${FOCUS}`}
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-text-primary/60 transition-colors duration-(--duration-base) group-hover:border-text-primary group-hover:bg-text-primary group-hover:text-background">
                  <ArrowDown
                    aria-hidden
                    className="size-4 transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:translate-y-0.5"
                  />
                </span>
                Comment ça marche
              </a>
            </StaggerItem>
            <StaggerItem className="mt-12 flex items-center gap-4">
              <span aria-hidden className="flex -space-x-2.5">
                {[Users, CalendarRange, Flag].map((Icon, i) => (
                  <span
                    key={i}
                    className={`flex size-10 items-center justify-center rounded-full border-2 border-background ${
                      i === 1 ? "bg-accent text-text-primary" : "bg-text-primary text-background"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                ))}
              </span>
              <p className="font-mono text-[11px] uppercase leading-snug tracking-wider text-text-secondary">
                Plusieurs groupes, plusieurs deadlines,
                <br />
                un seul planning par étudiant
              </p>
            </StaggerItem>
          </Stagger>
        </div>

        <HeroPreview depthBack={depthBack} depthFront={depthFront} />
      </div>
    </section>
  );
}
