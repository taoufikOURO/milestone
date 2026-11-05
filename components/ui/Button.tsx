import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

/** Classes partagées avec ButtonLink pour garder un rendu identique. */
export const BUTTON_BASE =
  "inline-flex min-h-10 select-none items-center justify-center gap-2 rounded-control px-4 py-2 font-semibold " +
  "transition-[background-color,color,box-shadow,transform,border-color] duration-(--duration-fast) ease-out-soft " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "motion-safe:active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0";

export const BUTTON_VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-background shadow-accent hover:bg-accent-strong",
  secondary: "bg-text-primary text-background shadow-soft hover:bg-ink-soft",
  ghost:
    "border border-border-soft bg-surface-raised/40 text-text-primary hover:border-text-secondary/40 hover:bg-surface",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth = false,
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
