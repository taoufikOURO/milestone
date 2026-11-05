"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import type { ReactNode } from "react";

/** Courbe et durées alignées sur les tokens de globals.css. */
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const;
export const DURATION = { fast: 0.14, base: 0.24, slow: 0.52 } as const;

/**
 * Transition qui devient instantanée quand l'utilisateur préfère réduire les
 * animations. MotionConfig (reducedMotion="user") coupe déjà les
 * déplacements ; ceci coupe aussi les fondus.
 */
export function useSafeTransition(transition: Transition): Transition {
  const reduce = useReducedMotion();
  return reduce ? { duration: 0 } : transition;
}

/** Apparition au défilement : fondu et léger glissement vers le haut. */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const transition = useSafeTransition({ duration: DURATION.slow, ease: EASE_OUT_SOFT, delay });
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={transition}
    >
      {children}
    </Component>
  );
}
