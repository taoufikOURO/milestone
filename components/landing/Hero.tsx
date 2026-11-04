import Link from "next/link";
import { FloatingCards } from "./FloatingCards";

export function Hero() {
  return (
    <section className="px-4 pb-16 pt-32 text-center sm:pt-40">
      <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
        Planifiez les projets de votre promo, sans friction
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base text-text-secondary sm:text-lg">
        Calendrier de promo, groupes, tâches et réunions : tout le monde sait quoi faire et pour
        quand.
      </p>
      <Link
        href="/inscription"
        className="mt-8 inline-block rounded-full bg-accent px-7 py-3.5 font-semibold text-background hover:opacity-90"
      >
        Créer une promo
      </Link>
      <FloatingCards />
    </section>
  );
}
