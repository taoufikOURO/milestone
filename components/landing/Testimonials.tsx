"use client";

import { useState } from "react";

// Exemples fictifs : à remplacer par de vrais avis.
const examples = [
  "Exemple de témoignage : « Enfin une vue claire des échéances de toute la promo. »",
  "Exemple de témoignage : « Notre groupe sait qui fait quoi, sans message de relance. »",
  "Exemple de témoignage : « Les réunions et les tâches sont au même endroit. »",
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const go = (d: number) => setI((i + d + examples.length) % examples.length);
  const btn =
    "flex size-10 items-center justify-center rounded-full border border-border-soft text-text-primary hover:bg-border-soft/40";
  return (
    <section className="px-4 py-16">
      <h2 className="text-center text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
        Avis
      </h2>
      <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-border-soft bg-background p-6 text-center shadow-[0_20px_40px_-16px_color-mix(in_srgb,var(--color-text-primary)_25%,transparent)] sm:p-8">
        <span className="rounded-full bg-border-soft px-3 py-1 text-xs font-semibold text-text-secondary">
          Exemple — avis fictifs
        </span>
        <p className="mt-5 min-h-24 text-lg font-medium text-text-primary" aria-live="polite">
          {examples[i]}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" aria-label="Avis précédent" onClick={() => go(-1)} className={btn}>
            ←
          </button>
          <button type="button" aria-label="Avis suivant" onClick={() => go(1)} className={btn}>
            →
          </button>
        </div>
      </div>
    </section>
  );
}
