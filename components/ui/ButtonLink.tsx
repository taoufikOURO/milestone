import Link from "next/link";
import type { ComponentProps } from "react";
import { BUTTON_BASE, BUTTON_VARIANTS } from "@/components/ui/Button";

// Lien de navigation présenté comme un bouton (mêmes variantes que Button).
const VARIANTS = {
  primary: BUTTON_VARIANTS.primary,
  ghost: BUTTON_VARIANTS.ghost,
} as const;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof VARIANTS }) {
  return <Link className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
