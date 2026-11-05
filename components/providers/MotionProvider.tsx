"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Respecte la préférence système « réduire les animations » pour toute
 * l'application. Les composants animés complètent avec useReducedMotion()
 * pour couper aussi les fondus (voir components/motion/).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
