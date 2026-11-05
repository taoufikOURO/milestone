import Link from "next/link";

/** Marque : un jalon (losange) posé sur un carré d'encre. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-text-primary ${className}`}
    >
      <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
    </span>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-control font-display text-lg font-bold tracking-tight text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <LogoMark />
      Milestone
    </Link>
  );
}
