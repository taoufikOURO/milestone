"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, EASE_OUT_SOFT } from "@/components/motion/Reveal";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT_SOFT } },
};

/** Liste dont les éléments apparaissent l'un après l'autre. Sans animation si « réduire les animations » est actif. */
export function StaggerList({
  children,
  className,
  as = "ul",
}: {
  children: ReactNode;
  className?: string;
  as?: "ul" | "ol" | "div";
}) {
  const reduce = useReducedMotion();
  const Component = motion[as];
  return (
    <Component className={className} variants={container} initial={reduce ? false : "hidden"} animate="show">
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "li",
}: {
  children: ReactNode;
  className?: string;
  as?: "li" | "div";
}) {
  const Component = motion[as];
  return (
    <Component className={className} variants={item}>
      {children}
    </Component>
  );
}
