"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { isActivePath, NAV_ITEMS } from "@/lib/nav";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(item.href, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-accent text-background"
                  : "text-text-secondary hover:bg-border-soft/40 hover:text-text-primary"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBlock({ name }: { name: string }) {
  return (
    <div className="space-y-2">
      <p className="truncate px-3 text-sm text-text-secondary" title={name}>
        {name}
      </p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-border-soft/40"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}

/** Barre latérale (≥ md) et barre du haut avec menu déroulant (mobile). */
export function Sidebar({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-border-soft p-4 md:flex">
        <div>
          <Link href="/accueil" className="mb-6 block px-3 text-xl font-bold text-accent">
            Milestone
          </Link>
          <nav aria-label="Navigation principale">
            <NavLinks />
          </nav>
        </div>
        <UserBlock name={userName} />
      </aside>

      <header className="border-b border-border-soft md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/accueil" className="text-lg font-bold text-accent">
            Milestone
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="rounded-lg border border-border-soft px-3 py-1.5 text-sm font-medium text-text-primary"
          >
            {open ? "Fermer" : "Menu"}
          </button>
        </div>
        {open ? (
          <div id="mobile-menu" className="space-y-3 border-t border-border-soft px-4 py-3">
            <nav aria-label="Navigation principale">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <UserBlock name={userName} />
          </div>
        ) : null}
      </header>
    </>
  );
}
