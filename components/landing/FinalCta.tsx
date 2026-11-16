import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { RevealWords } from "./motion";
import { ARROW, BTN_OUTLINE, POSTER, REDUCE_VISIBLE, SectionLabel } from "./ui";

/** Composition géométrique en niveaux de la palette (à la place d'une photo). */
function Blocks() {
  return (
    <div
      aria-hidden
      className="relative h-full min-h-[22rem] overflow-hidden rounded-panel bg-[linear-gradient(160deg,#ccc5b9_0%,color-mix(in_srgb,#ccc5b9_40%,#fffcf2)_55%)] [clip-path:polygon(0_0,82%_0,100%_18%,100%_100%,0_100%)]"
    >
      <span className="absolute -bottom-6 left-[8%] h-[62%] w-[34%] rounded-t-2xl bg-text-secondary" />
      <span className="absolute -bottom-6 left-[36%] h-[82%] w-[30%] rounded-t-2xl bg-text-primary" />
      <span className="absolute -bottom-6 left-[60%] h-[46%] w-[30%] rounded-t-2xl bg-[color-mix(in_srgb,#403d39_70%,#ccc5b9)]" />
      <span className="absolute bottom-[30%] left-[44%] h-[22%] w-[9%] rounded-t-md bg-accent" />
      <span className="absolute left-[46%] top-[11%] size-5 rotate-45 rounded-[4px] bg-accent" />
      <span className="absolute left-[calc(46%+0.62rem)] top-[calc(11%+1.5rem)] h-[6%] w-px bg-text-primary/50" />
      <p className="absolute left-6 top-6 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-text-primary">
        Du premier jour
        <br />à la deadline
      </p>
    </div>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="cta-titre" className="px-gutter pb-section">
      <div className="mx-auto grid max-w-[88rem] gap-6 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-stretch lg:gap-8">
        <Reveal className={`hidden lg:block ${REDUCE_VISIBLE}`}>
          <Blocks />
        </Reveal>

        <div className="flex flex-col justify-center py-4 lg:py-10">
          <SectionLabel index="05">Pour commencer</SectionLabel>
          <RevealWords
            id="cta-titre"
            className={`${POSTER} mt-6 text-section text-text-primary`}
            lines={[{ text: "Une promo." }, { text: "Des groupes.", faint: true }, { text: "Un planning.", faint: true }]}
          />
          <p className="mt-6 max-w-sm leading-relaxed text-text-secondary">
            Le délégué crée la promo et partage son code. Chaque groupe ajoute ses tâches, Milestone les place dans
            le planning de chacun.
          </p>
          <Link href="/connexion" className={`${BTN_OUTLINE} mt-8 w-fit`}>
            J’ai déjà un compte
            <ArrowRight aria-hidden className={ARROW} />
          </Link>
        </div>

        {/* Panneau orange en biais : tout le panneau est le lien vers l'inscription. */}
        <Reveal delay={0.1} className={REDUCE_VISIBLE}>
          <Link
            href="/inscription"
            className="group relative flex h-full min-h-[18rem] flex-col justify-between overflow-hidden rounded-panel bg-accent p-7 pl-[22%] text-text-primary transition-shadow duration-(--duration-base) [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)] hover:shadow-raised focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-text-primary focus-visible:ring-inset sm:min-h-[22rem] sm:p-10 sm:pl-[24%]"
          >
            <span aria-hidden className="absolute right-8 top-8 h-px w-16 bg-text-primary/40" />
            <span className={`${POSTER} block text-4xl leading-[0.95] sm:text-5xl`}>
              Lancez
              <br />
              votre première
              <br />
              promo
            </span>
            <span className="mt-10 flex items-center gap-4 self-end">
              <span className="font-mono text-xs uppercase tracking-wider">Créer une promo</span>
              <span className="flex size-14 items-center justify-center rounded-full border-2 border-text-primary transition-colors duration-(--duration-base) group-hover:bg-text-primary group-hover:text-accent">
                <ArrowRight aria-hidden className={`${ARROW} size-5`} />
              </span>
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
