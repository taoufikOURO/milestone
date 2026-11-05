import type { HTMLAttributes } from "react";

const TONES = {
  default: "border-border-soft/80 bg-surface-raised shadow-soft",
  muted: "border-line bg-surface",
} as const;

export function Card({
  tone = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: "default" | "muted" }) {
  return (
    <div className={`rounded-card border p-4 sm:p-6 ${TONES[tone]} ${className}`} {...props} />
  );
}
