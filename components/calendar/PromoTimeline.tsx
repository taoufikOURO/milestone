import { FolderKanban } from "lucide-react";
import Link from "next/link";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { barLayout, displayRange } from "@/lib/domain/timeline";
import { formatDate } from "@/lib/format";
import type { PromoCalendarGroup } from "@/lib/services/calendar";

// Frise de la promo (§5.1) : une ligne par groupe, une barre du début à la fin,
// remplie selon l'avancement. Grille CSS maison. Seule la frise défile
// horizontalement ; la page, jamais.
export function PromoTimeline({ groups }: { groups: PromoCalendarGroup[] }) {
  const range = displayRange(groups.map((g) => ({ start: g.startDate, end: g.deadline })));
  if (!range) {
    return (
      <EmptyState icon={FolderKanban} compact>
        Aucun groupe pour l&apos;instant.
      </EmptyState>
    );
  }

  return (
    <div className="mt-4 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Calendrier de la promo">
      <div className="min-w-[640px] space-y-3 pb-2">
        <div className="flex justify-between border-b border-line pb-2 font-mono text-eyebrow uppercase text-muted">
          <span>{formatDate(range.start)}</span>
          <span>{formatDate(range.end)}</span>
        </div>
        <StaggerList className="space-y-4">
          {groups.map((g) => {
            const layout = barLayout({ start: g.startDate, end: g.deadline }, range);
            if (!layout) return null;
            const label = `${g.name} · ${g.progressPercent} % · fin le ${formatDate(g.deadline)}`;
            const bar = (
              <span
                className="relative block h-9 overflow-hidden rounded-control border border-line bg-border-soft/60"
                style={{ marginLeft: `${layout.leftPercent}%`, width: `${layout.widthPercent}%`, minWidth: "0.5rem" }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-control bg-accent"
                  style={{ width: `${g.progressPercent}%` }}
                  aria-hidden
                />
                <span className="absolute inset-y-0 left-3 flex items-center whitespace-nowrap font-mono text-xs font-medium text-text-primary">
                  {g.progressPercent} % · fin le {formatDate(g.deadline)}
                </span>
              </span>
            );
            return (
              <StaggerItem key={g.id}>
                <p className="truncate font-display text-sm font-bold text-text-primary">{g.name}</p>
                {g.isMember ? (
                  <Link
                    href={`/groupes/${g.id}`}
                    aria-label={label}
                    className="mt-1.5 block rounded-control transition-[box-shadow,filter] duration-(--duration-fast) ease-out-soft hover:shadow-soft hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {bar}
                  </Link>
                ) : (
                  <div role="img" aria-label={label} className="mt-1.5">
                    {bar}
                  </div>
                )}
              </StaggerItem>
            );
          })}
        </StaggerList>
      </div>
    </div>
  );
}
