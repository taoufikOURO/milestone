import type { HTMLAttributes } from "react";

const TONES = {
  neutral: "bg-border-soft/50 text-text-secondary",
  accent: "bg-accent/15 text-accent",
  dark: "bg-text-primary text-background",
} as const;

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}
