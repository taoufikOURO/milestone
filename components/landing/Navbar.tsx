import Link from "next/link";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex max-w-4xl items-center justify-between gap-2 rounded-full border border-border-soft bg-background/90 py-2 pl-4 pr-2 shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--color-text-primary)_25%,transparent)] backdrop-blur"
      >
        <Link href="/" className="flex items-center gap-2 font-bold text-text-primary">
          <span aria-hidden className="size-6 rounded-lg bg-accent" />
          Milestone
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-text-secondary md:flex">
          <a href="#fonctionnalites" className="hover:text-text-primary">
            Fonctionnalités
          </a>
          <a href="#comment-ca-marche" className="hover:text-text-primary">
            Comment ça marche
          </a>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/connexion"
            className="rounded-full border border-border-soft px-3 py-2 text-text-primary hover:bg-border-soft/40 sm:px-4"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="hidden rounded-full bg-accent px-4 py-2 text-background hover:opacity-90 sm:inline-block"
          >
            Créer une promo
          </Link>
        </div>
      </nav>
    </header>
  );
}
