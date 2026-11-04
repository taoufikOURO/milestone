// Navigation principale (§6.4). Module pur, partagé par la barre latérale et la barre mobile.

export const NAV_ITEMS = [
  { href: "/accueil", label: "Accueil" },
  { href: "/promo", label: "Promo" },
  { href: "/mon-calendrier", label: "Mon calendrier" },
  { href: "/profil", label: "Profil" },
] as const;

/** Lien actif : la page elle-même ou l'une de ses sous-pages. */
export function isActivePath(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
