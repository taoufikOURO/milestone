"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";

/** Apparition discrète d'un bloc au chargement de la page (fondu et léger glissement). */
export function Appear({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const transition = useSafeTransition({ duration: DURATION.base, ease: EASE_OUT_SOFT, delay });
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
      {children}
    </motion.div>
  );
}
