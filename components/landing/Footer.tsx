import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 overflow-hidden border-t border-border-soft px-4 pt-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 sm:flex-row sm:justify-between">
        <p className="max-w-xs text-sm text-text-secondary">
          Milestone aide les promotions à planifier leurs projets de groupe.
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-text-primary">
          <li>
            <a href="#fonctionnalites">Fonctionnalités</a>
          </li>
          <li>
            <a href="#comment-ca-marche">Comment ça marche</a>
          </li>
          <li>
            <Link href="/connexion">Se connecter</Link>
          </li>
          <li>
            <Link href="/inscription">Créer une promo</Link>
          </li>
        </ul>
      </div>
      <p
        aria-hidden
        className="mt-10 select-none text-center text-[22vw] font-extrabold leading-[0.8] tracking-tight text-accent/30 sm:text-[16vw]"
      >
        Milestone
      </p>
    </footer>
  );
}
