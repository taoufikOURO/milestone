import Link from "next/link";
import type { ComponentProps } from "react";

// Lien de navigation présenté comme un bouton (mêmes variantes que Button).
const VARIANTS = {
  primary: "bg-accent text-background hover:brightness-95",
  ghost: "border border-border-soft bg-transparent text-text-primary hover:bg-border-soft/30",
} as const;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof VARIANTS }) {
  return (
    <Link
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
