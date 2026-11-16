import type { ReactNode } from "react";

/*
 * Primitives visuelles de la landing (composant serveur, sans état).
 * Texte sur l'orange : toujours #252422 (4,5:1) ; le clair n'atteint que 3,3:1.
 */

/**
 * Garde le contenu visible et immobile quand l'utilisateur préfère réduire les
 * animations, dès le HTML serveur (le !important l'emporte sur le style en
 * ligne de motion). Défini ici, hors module client, pour rester une chaîne
 * utilisable dans les composants serveur.
 */
export const REDUCE_VISIBLE = "motion-reduce:opacity-100! motion-reduce:transform-none!";

export const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const BTN =
  "group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 text-base font-semibold " +
  "transition-[transform,box-shadow,background-color,border-color,color] duration-(--duration-base) ease-out-soft " +
  `motion-safe:hover:-translate-y-0.5 ${FOCUS}`;

export const BTN_PRIMARY = `${BTN} bg-accent text-text-primary shadow-accent hover:shadow-raised`;
export const BTN_DARK = `${BTN} bg-text-primary text-background shadow-soft hover:shadow-raised`;
export const BTN_OUTLINE = `${BTN} border border-text-primary/70 text-text-primary hover:border-text-primary hover:bg-text-primary hover:text-background`;

/** Flèche qui glisse au survol du parent `.group`. */
export const ARROW =
  "size-4 shrink-0 transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:translate-x-1";

/** Titres en capitales, grotesque resserrée. */
export const POSTER = "font-display font-extrabold uppercase font-stretch-[78%]";

/** Libellé de section numéroté : « / 02 ── Libellé ». */
export function SectionLabel({
  index,
  children,
  tone = "light",
  className = "",
}: {
  index: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <p
      className={`flex items-center gap-3 font-mono text-eyebrow uppercase ${
        dark ? "text-background/80" : "text-text-secondary"
      } ${className}`}
    >
      <span className={dark ? "text-accent" : "text-accent-ink"}>/ {index}</span>
      <span aria-hidden className="h-px w-8 bg-current opacity-40" />
      {children}
    </p>
  );
}
