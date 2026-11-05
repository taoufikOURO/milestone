import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** État vide : une icône, une phrase claire, éventuellement les actions possibles. */
export function EmptyState({
  icon: Icon,
  children,
  actions,
  compact = false,
}: {
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-3 py-4" : "gap-4 py-8"}`}>
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-text-secondary [&_svg]:size-5"
      >
        <Icon />
      </span>
      <p className="max-w-prose text-sm leading-relaxed text-text-secondary sm:text-base">{children}</p>
      {actions ? <div className="flex flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  );
}
