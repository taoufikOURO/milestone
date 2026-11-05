import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-titre" className="px-gutter py-section">
      <Reveal className="mx-auto max-w-page">
        <div className="bg-grid-ink relative isolate overflow-hidden rounded-panel bg-text-primary px-6 py-16 text-center shadow-float sm:px-12 sm:py-24">
          <span
            aria-hidden
            className="absolute -right-16 -top-16 -z-10 size-56 rotate-45 rounded-[2.5rem] border border-accent/30 sm:size-72"
          />
          <span
            aria-hidden
            className="absolute -bottom-20 -left-12 -z-10 size-48 rotate-45 rounded-[2rem] bg-accent/12"
          />
          <h2 id="cta-titre" className="mx-auto max-w-3xl text-headline font-extrabold text-background">
            Votre promo a des projets. Donnez-leur un calendrier.
          </h2>
          <p className="mx-auto mt-5 max-w-prose leading-relaxed text-background/70 sm:text-lg">
            Créez la promo et partagez son code, ou connectez-vous pour retrouver vos groupes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/inscription" className="group h-12 w-full rounded-full! px-6 text-base sm:w-auto">
              Créer une promo
              <ArrowRight className="transition-transform duration-(--duration-base) ease-out-soft motion-safe:group-hover:translate-x-0.5" />
            </ButtonLink>
            <Link
              href="/connexion"
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-background/20 px-6 text-base font-semibold text-background transition-colors duration-(--duration-fast) hover:border-background/40 hover:bg-background/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
