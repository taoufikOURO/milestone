import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

const TONES = {
  default: "rounded-card border-border-soft/80 bg-surface-raised p-4 shadow-soft sm:p-6",
  muted: "rounded-card border-line bg-surface p-4 sm:p-6",
  panel: "rounded-panel border-border-soft/80 bg-surface-raised p-6 shadow-raised sm:p-8",
} as const;

export function Card({
  tone = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof TONES }) {
  return <div className={`border ${TONES[tone]} ${className}`} {...props} />;
}

/** Titre de section d'une carte : icône sur fond d'accent doux, titre, élément annexe à droite. */
export function CardTitle({
  icon: Icon,
  children,
  aside,
  level = 2,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  aside?: ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <Heading className="flex min-w-0 items-center gap-2.5 font-display text-title font-bold text-text-primary">
        {Icon ? (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent [&_svg]:size-4"
          >
            <Icon />
          </span>
        ) : null}
        <span className="min-w-0 break-words">{children}</span>
      </Heading>
      {aside}
    </div>
  );
}
