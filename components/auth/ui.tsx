import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center text-xl font-bold text-accent">
          Milestone
        </Link>
        <div className="rounded-2xl border border-border-soft bg-white/60 p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-text-secondary">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-text-secondary">{footer}</div> : null}
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  hint,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1 block w-full rounded-lg border bg-background px-3 py-2 text-text-primary outline-none focus:ring-2 focus:ring-accent/40 ${
          error ? "border-accent" : "border-border-soft"
        }`}
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

export function Alert({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${
        tone === "error"
          ? "border-accent/40 bg-accent/10 text-text-primary"
          : "border-border-soft bg-border-soft/30 text-text-secondary"
      }`}
    >
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-background transition hover:brightness-95 disabled:opacity-60"
    >
      {pending ? "Patientez…" : children}
    </button>
  );
}
