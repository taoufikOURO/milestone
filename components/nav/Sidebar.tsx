"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, House, LogOut, Menu, UserRound, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DURATION, EASE_OUT_SOFT } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/landing/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/lib/actions/auth";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";

const ICONS: Record<(typeof NAV_ITEMS)[number]["href"], LucideIcon> = {
  "/accueil": House,
  "/promo": Users,
  "/mon-calendrier": CalendarDays,
  "/profil": UserRound,
};

function Brand() {
  return (
    <Link
      href="/accueil"
      className="flex items-center gap-2.5 rounded-control font-display text-lg font-bold tracking-tight text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <LogoMark />
      Milestone
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(item.href, pathname);
        const Icon = ICONS[item.href];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "bg-text-primary text-background shadow-soft"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              <Icon aria-hidden className={`size-4.5 shrink-0 ${active ? "text-accent" : ""}`} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBlock({ name, firstName, lastName }: { name: string; firstName: string; lastName: string }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div className="flex items-center gap-3 px-1">
        <Avatar firstName={firstName} lastName={lastName} />
        <p className="min-w-0 truncate text-sm font-semibold text-text-primary" title={name}>
          {name}
        </p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" fullWidth>
          <LogOut aria-hidden />
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}

/** Barre latérale (≥ md) et barre du haut avec menu déroulant (mobile). */
export function Sidebar({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const [firstName = "", ...rest] = userName.split(" ");
  const lastName = rest.join(" ");

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-line bg-surface/60 p-4 md:sticky md:top-0 md:flex md:h-screen">
        <div>
          <div className="mb-8 px-2 pt-1">
            <Brand />
          </div>
          <nav aria-label="Navigation principale">
            <NavLinks />
          </nav>
        </div>
        <UserBlock name={userName} firstName={firstName} lastName={lastName} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <Button
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="min-h-9 px-3 py-1.5 text-sm"
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
            {open ? "Fermer" : "Menu"}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              id="mobile-menu"
              key="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT_SOFT }}
              className="space-y-4 border-t border-line px-4 py-4"
            >
              <nav aria-label="Navigation principale">
                <NavLinks onNavigate={() => setOpen(false)} />
              </nav>
              <UserBlock name={userName} firstName={firstName} lastName={lastName} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
