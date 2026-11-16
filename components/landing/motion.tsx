"use client";

import { motion, type Variants } from "motion/react";
import { Fragment, type ReactNode } from "react";
import { DURATION, EASE_OUT_SOFT } from "@/components/motion/Reveal";
import { REDUCE_VISIBLE } from "./ui";

/*
 * Primitives d'animation de la landing.
 * « Réduire les animations » : MotionConfig (reducedMotion="user") coupe les
 * déplacements, et REDUCE_VISIBLE garde le contenu visible et immobile dès le
 * HTML serveur, avant même l'hydratation (le !important l'emporte sur le style
 * en ligne de motion). `initial` ne dépend jamais de la préférence : le rendu
 * serveur et le rendu client restent identiques (pas d'écart d'hydratation).
 */

type Trigger = "load" | "view";

function triggerProps(trigger: Trigger) {
  return trigger === "load"
    ? { animate: "show" }
    : { whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } };
}

const group = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const word: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.8, ease: EASE_OUT_SOFT } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow * 1.2, ease: EASE_OUT_SOFT } },
};

export type TitleLine = { text: string; faint?: boolean };

/** Titre révélé mot par mot, chaque mot glissant hors d'un masque. */
export function RevealWords({
  lines,
  as = "h2",
  id,
  className = "",
  faintClass = "text-text-faint",
  trigger = "view",
  delay = 0,
}: {
  lines: TitleLine[];
  as?: "h1" | "h2";
  id?: string;
  className?: string;
  faintClass?: string;
  trigger?: Trigger;
  delay?: number;
}) {
  const Tag = motion[as];
  return (
    <Tag
      id={id}
      className={className}
      variants={group(0.055, delay)}
      initial="hidden"
      {...triggerProps(trigger)}
    >
      {lines.map((line, i) => (
        <span key={i} className={`block ${line.faint ? faintClass : ""}`}>
          {line.text.split(" ").map((w, j) => (
            <Fragment key={j}>
              <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-top">
                <motion.span className={`inline-block ${REDUCE_VISIBLE}`} variants={word}>
                  {w}
                </motion.span>
              </span>{" "}
            </Fragment>
          ))}
        </span>
      ))}
    </Tag>
  );
}

/** Groupe dont les enfants <StaggerItem> entrent l'un après l'autre (fondu et glissement). */
export function Stagger({
  as = "div",
  className,
  children,
  stagger = 0.09,
  delay = 0,
  trigger = "view",
}: {
  as?: "div" | "ul" | "ol";
  className?: string;
  children: ReactNode;
  stagger?: number;
  delay?: number;
  trigger?: Trigger;
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={group(stagger, delay)}
      initial="hidden"
      {...triggerProps(trigger)}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  as = "div",
  className = "",
  children,
}: {
  as?: "div" | "li";
  className?: string;
  children: ReactNode;
}) {
  const Tag = motion[as];
  return (
    <Tag className={`${REDUCE_VISIBLE} ${className}`} variants={item}>
      {children}
    </Tag>
  );
}

/** Trait qui se dessine de gauche à droite (ou de haut en bas) à l'entrée dans la vue. */
export function DrawLine({ className, vertical = false }: { className: string; vertical?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className={`${REDUCE_VISIBLE} ${vertical ? "origin-top" : "origin-left"} ${className}`}
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={{ duration: 1.1, ease: EASE_OUT_SOFT, delay: 0.15 }}
    />
  );
}
