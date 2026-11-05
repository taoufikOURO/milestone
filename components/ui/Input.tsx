import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Classes de champ partagées avec Select. */
export const FIELD_CLASSES =
  "mt-1.5 block w-full rounded-control border bg-surface-raised px-3.5 py-2.5 text-text-primary shadow-hairline " +
  "placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] duration-(--duration-fast) ease-out-soft " +
  "hover:border-text-secondary/40 focus:border-accent focus:ring-4 focus:ring-accent/15 " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70";

export function fieldBorder(error?: string) {
  return error ? "border-accent" : "border-border-soft";
}

export function FieldMessage({ name, error, hint }: { name: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-accent-strong">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${name}-hint`} className="mt-1.5 text-xs text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

export function Input({ label, name, error, hint, className = "", ...props }: InputProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${FIELD_CLASSES} ${fieldBorder(error)} ${className}`}
        {...props}
      />
      <FieldMessage name={name} error={error} hint={hint} />
    </div>
  );
}
