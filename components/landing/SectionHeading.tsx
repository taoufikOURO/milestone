import { Reveal } from "@/components/motion/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  id: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className="flex items-center gap-2 font-mono text-eyebrow uppercase text-accent-strong">
        <span aria-hidden className="h-px w-6 bg-accent" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-4 text-headline font-extrabold text-text-primary">
        {title}
      </h2>
      <p className="mt-5 max-w-prose text-base leading-relaxed text-text-secondary sm:text-lg">{intro}</p>
    </Reveal>
  );
}
