import Link from "next/link";
import type { ComponentProps } from "react";

/** Lien textuel du système de design : souligné discret, accent au survol. */
export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`font-semibold text-text-primary underline decoration-border-soft underline-offset-4 transition-colors duration-(--duration-fast) hover:text-accent-strong hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...props}
    />
  );
}
