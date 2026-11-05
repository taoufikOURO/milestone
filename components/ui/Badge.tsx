import type { HTMLAttributes } from "react";

const TONES = {
  neutral: "border-line bg-surface text-text-secondary",
  accent: "border-accent/25 bg-accent-soft text-accent-strong",
  dark: "border-text-primary bg-text-primary text-background",
} as const;

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 [&_svg]:size-3.5 ${TONES[tone]} ${className}`}
      {...props}
    />
  );
}
