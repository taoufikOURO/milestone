import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Découvrir",
    links: [
      { href: "#comment-ca-marche", label: "Comment ça marche", anchor: true },
      { href: "#fonctionnalites", label: "Fonctionnalités", anchor: true },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/connexion", label: "Se connecter", anchor: false },
      { href: "/inscription", label: "Créer une promo", anchor: false },
    ],
  },
];

const linkClass =
  "rounded-sm text-text-secondary transition-colors duration-(--duration-fast) hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-line px-gutter pt-16">
      <div className="mx-auto grid max-w-page gap-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs leading-relaxed text-text-secondary">
            Milestone aide les promotions à planifier leurs projets de groupe, du premier jour à
            l’échéance.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-mono text-eyebrow uppercase text-muted">{col.title}</p>
            <ul className="mt-4 space-y-3 font-medium">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.anchor ? (
                    <a href={l.href} className={linkClass}>
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className={linkClass}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p
        aria-hidden
        className="mx-auto mt-16 max-w-page select-none text-center font-display text-[21vw] font-extrabold leading-[0.78] tracking-[-0.06em] text-accent/20 lg:text-[15.5rem]"
      >
        Milestone
      </p>
    </footer>
  );
}
