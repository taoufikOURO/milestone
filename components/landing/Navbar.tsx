"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DURATION, EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";
import { Logo } from "./Logo";
import { ARROW, BTN_DARK, BTN_OUTLINE, FOCUS, REDUCE_VISIBLE } from "./ui";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  const enter = useSafeTransition({ duration: DURATION.slow, ease: EASE_OUT_SOFT });
  const panel = useSafeTransition({ duration: DURATION.base, ease: EASE_OUT_SOFT });

  // Échap ferme le menu mobile.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enter}
      className={`fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4 ${REDUCE_VISIBLE}`}
    >
      <nav
        aria-label="Navigation principale"
        className={`mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-(--duration-base) ease-out-soft md:grid-cols-[1fr_auto_1fr] ${
          scrolled || open
            ? "border-border-soft/80 bg-background/90 shadow-raised"
            : "border-line/70 bg-background/65 shadow-hairline"
        }`}
      >
        <Logo caption="Projets de promo" />

        <ul className="hidden items-center gap-1 text-sm font-medium text-text-secondary md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`rounded-full px-4 py-2.5 transition-colors duration-(--duration-fast) hover:bg-surface hover:text-text-primary ${FOCUS}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center justify-end gap-1.5 text-sm md:flex">
          <Link
            href="/connexion"
            className={`whitespace-nowrap rounded-full px-4 py-2.5 font-semibold text-text-primary transition-colors duration-(--duration-fast) hover:bg-surface ${FOCUS}`}
          >
            Se connecter
          </Link>
          <Link href="/inscription" className={`${BTN_DARK} min-h-10! px-5! text-sm!`}>
            Créer une promo
            <ArrowRight aria-hidden className={ARROW} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className={`flex size-11 items-center justify-center rounded-full bg-text-primary text-background md:hidden ${FOCUS}`}
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="menu-mobile"
            key="menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={panel}
            className="mx-auto mt-2 max-w-6xl rounded-panel border border-border-soft/80 bg-background p-3 shadow-float md:hidden"
          >
            <ul className="divide-y divide-line">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={close}
                    className={`group flex min-h-14 items-center justify-between rounded-control px-3 font-display text-xl font-bold text-text-primary ${FOCUS}`}
                  >
                    {l.label}
                    <ArrowRight aria-hidden className={`${ARROW} text-accent-ink`} />
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2">
              <Link href="/connexion" onClick={close} className={`${BTN_OUTLINE} w-full`}>
                Se connecter
              </Link>
              <Link href="/inscription" onClick={close} className={`${BTN_DARK} w-full`}>
                Créer une promo
                <ArrowRight aria-hidden className={ARROW} />
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
