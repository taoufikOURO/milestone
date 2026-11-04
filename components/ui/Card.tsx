import type { HTMLAttributes } from "react";

export function Card({
  tone = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: "default" | "muted" }) {
  return (
    <div
      className={`rounded-2xl border border-border-soft p-4 shadow-sm sm:p-6 ${
        tone === "muted" ? "bg-border-soft/30" : "bg-white/60"
      } ${className}`}
      {...props}
    />
  );
}
