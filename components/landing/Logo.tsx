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

/** Logo cliquable ; `caption` ajoute une petite légende sous le nom. */
export function Logo({ caption }: { caption?: string }) {
  return (
    <Link
      href="/"
      aria-label="Milestone, accueil"
      className="flex items-center gap-2.5 rounded-control text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <LogoMark />
      <span className="flex flex-col">
        <span className="font-display text-lg font-bold leading-none tracking-tight">Milestone</span>
        {caption ? (
          <span className="mt-1 font-mono text-[9px] uppercase leading-none tracking-[0.12em] text-text-secondary">
            {caption}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
