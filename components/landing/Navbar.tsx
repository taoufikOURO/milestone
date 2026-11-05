"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { DURATION, EASE_OUT_SOFT, useSafeTransition } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  const transition = useSafeTransition({ duration: DURATION.slow, ease: EASE_OUT_SOFT });

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4"
    >
      <nav
        aria-label="Navigation principale"
        className={`mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-full border py-1.5 pl-3 pr-1.5 backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-(--duration-base) ease-out-soft sm:pl-4 ${
          scrolled
            ? "border-border-soft/80 bg-background/85 shadow-raised"
            : "border-line/70 bg-background/60 shadow-hairline"
        }`}
      >
        <Logo />
        <div className="hidden items-center gap-1 text-sm font-medium text-text-secondary md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 transition-colors duration-(--duration-fast) hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            href="/connexion"
            className="whitespace-nowrap rounded-full px-3.5 py-2 font-semibold text-text-primary transition-colors duration-(--duration-fast) hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
          >
            Se connecter
          </Link>
          {/* Masqué sous 640 px : le bouton du héros prend le relais. */}
          <span className="hidden sm:block">
            <ButtonLink href="/inscription" className="whitespace-nowrap rounded-full!">
              Créer une promo
            </ButtonLink>
          </span>
        </div>
      </nav>
    </motion.header>
  );
}
