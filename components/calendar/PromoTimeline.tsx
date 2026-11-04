import Link from "next/link";
import { barLayout, displayRange } from "@/lib/domain/timeline";
import { formatDate } from "@/lib/format";
import type { PromoCalendarGroup } from "@/lib/services/calendar";

// Frise de la promo (§5.1) : une ligne par groupe, une barre du début à la fin,
// remplie selon l'avancement. Grille CSS maison. Seule la frise défile
// horizontalement ; la page, jamais.
export function PromoTimeline({ groups }: { groups: PromoCalendarGroup[] }) {
  const range = displayRange(groups.map((g) => ({ start: g.startDate, end: g.deadline })));
  if (!range) {
    return <p className="mt-3 text-sm text-text-secondary">Aucun groupe pour l&apos;instant.</p>;
  }

  return (
    <div className="mt-3 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Calendrier de la promo">
      <div className="min-w-[640px] space-y-3 pb-2">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{formatDate(range.start)}</span>
          <span>{formatDate(range.end)}</span>
        </div>
        <ul className="space-y-3">
          {groups.map((g) => {
            const layout = barLayout({ start: g.startDate, end: g.deadline }, range);
            if (!layout) return null;
            const label = `${g.name} · ${g.progressPercent} % · fin le ${formatDate(g.deadline)}`;
            const bar = (
              <span
                className="relative block h-9 rounded-lg bg-border-soft"
                style={{ marginLeft: `${layout.leftPercent}%`, width: `${layout.widthPercent}%`, minWidth: "0.5rem" }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-lg bg-accent"
                  style={{ width: `${g.progressPercent}%` }}
                  aria-hidden
                />
                <span className="absolute inset-y-0 left-2 flex items-center whitespace-nowrap text-xs font-medium text-text-primary">
                  {g.progressPercent} % · fin le {formatDate(g.deadline)}
                </span>
              </span>
            );
            return (
              <li key={g.id}>
                <p className="truncate text-sm font-medium text-text-primary">{g.name}</p>
                {g.isMember ? (
                  <Link href={`/groupes/${g.id}`} aria-label={label} className="mt-1 block hover:opacity-80">
                    {bar}
                  </Link>
                ) : (
                  <div role="img" aria-label={label} className="mt-1">
                    {bar}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
