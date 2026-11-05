import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Appear } from "@/components/motion/Appear";

/** En-tête de page : titre h1, phrase d'introduction facultative, actions à droite. */
export function PageHeader({
  title,
  icon: Icon,
  description,
  actions,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Appear>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
            {Icon ? (
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-control bg-text-primary text-accent [&_svg]:size-5"
              >
                <Icon />
              </span>
            ) : null}
            <span className="min-w-0 break-words">{title}</span>
          </h1>
          {description ? <p className="mt-2 max-w-prose text-sm text-text-secondary sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
    </Appear>
  );
}
