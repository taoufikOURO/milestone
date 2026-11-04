import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-background hover:brightness-95",
  secondary: "bg-text-primary text-background hover:bg-text-secondary",
  ghost: "border border-border-soft bg-transparent text-text-primary hover:bg-border-soft/30",
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
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
