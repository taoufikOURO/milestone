"use client";

import { CalendarDays, LayoutDashboard, ListChecks, Settings, Users, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DURATION, EASE_OUT_SOFT } from "@/components/motion/Reveal";

type Item = { href: string; label: string; icon: LucideIcon };

/**
 * Sous-navigation d'un groupe (§6.4). Paramètres n'apparaît que pour le chef ;
 * la page revérifie le rôle côté serveur.
 */
export function GroupNav({ groupId, isLeader }: { groupId: string; isLeader: boolean }) {
  const pathname = usePathname();
  const base = `/groupes/${groupId}`;
  const items: Item[] = [
    { href: base, label: "Aperçu", icon: LayoutDashboard },
    { href: `${base}/calendrier`, label: "Calendrier", icon: CalendarDays },
    { href: `${base}/taches`, label: "Tâches", icon: ListChecks },
    { href: `${base}/membres`, label: "Membres", icon: Users },
    ...(isLeader ? [{ href: `${base}/parametres`, label: "Paramètres", icon: Settings }] : []),
  ];
  return (
    <nav aria-label="Navigation du groupe" className="overflow-x-auto pb-1">
      <ul className="flex w-max min-w-full gap-1 rounded-card border border-line bg-surface p-1 sm:min-w-0">
        {items.map((item) => {
          // Une page de tâche garde l'onglet « Tâches » actif.
          const active = pathname === item.href || (item.href !== base && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-control px-3.5 py-2 text-sm font-semibold transition-colors duration-(--duration-fast) ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active ? "text-background" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="group-nav-active"
                    aria-hidden
                    className="absolute inset-0 rounded-control bg-text-primary shadow-soft"
                    transition={{ duration: DURATION.base, ease: EASE_OUT_SOFT }}
                  />
                ) : null}
                <Icon aria-hidden className={`relative size-4 shrink-0 ${active ? "text-accent" : ""}`} />
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
