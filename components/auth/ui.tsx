import Link from "next/link";
import type { ReactNode } from "react";
import { Appear } from "@/components/motion/Appear";
import { LogoMark } from "@/components/landing/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

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
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Feuille de planning en fond, estompée sur les bords. */}
      <div
        aria-hidden
        className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_20%,transparent_75%)]"
      />
      <Appear className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-control font-display text-lg font-bold tracking-tight text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <LogoMark />
          Milestone
        </Link>
        <Card tone="panel">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-text-secondary">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </Card>
        {footer ? <div className="mt-5 text-center text-sm text-text-secondary">{footer}</div> : null}
      </Appear>
    </main>
  );
}

/** Champ de formulaire d'authentification : Input du système de design, obligatoire par défaut. */
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
  return (
    <Input
      label={label}
      name={name}
      type={type}
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      required={required}
      error={error}
      hint={hint}
    />
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" fullWidth disabled={pending}>
      {pending ? "Patientez…" : children}
    </Button>
  );
}
