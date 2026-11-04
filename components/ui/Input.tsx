import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

export function Input({ label, name, error, hint, className = "", ...props }: InputProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded-lg border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent/40 ${
          error ? "border-accent" : "border-border-soft"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-sm text-accent">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
