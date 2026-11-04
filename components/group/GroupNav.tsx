"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sous-navigation d'un groupe (§6.4). Paramètres n'apparaît que pour le chef ;
 * la page revérifie le rôle côté serveur.
 */
export function GroupNav({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const pathname = usePathname();
  const base = `/groupes/${groupId}`;
  const items = [
    { href: base, label: "Aperçu" },
    { href: `${base}/membres`, label: "Membres" },
    ...(isLeader ? [{ href: `${base}/parametres`, label: "Paramètres" }] : []),
  ];
  return (
    <nav aria-label="Navigation du groupe" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1 px-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-text-primary text-background" : "text-text-secondary hover:bg-border-soft/40"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
