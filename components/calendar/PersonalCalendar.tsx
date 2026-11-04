import Link from "next/link";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Card } from "@/components/ui/Card";
import { formatDay } from "@/lib/format";
import type { CalendarView } from "@/lib/services/planning-view";

// « Mon calendrier » (§5.3) : les tâches et réunions de l'étudiant dans tous
// ses groupes, sur une seule frise, et les conflits de tous ses groupes, y
// compris les tâches non assignées.
export function PersonalCalendar({ view }: { view: CalendarView }) {
  if (view.groups.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">
          Vous n&apos;êtes dans aucun groupe.{" "}
          <Link href="/groupes/creer" className="font-semibold text-accent hover:underline">
            Créer un groupe
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Mes tâches</h2>
        <MonthCalendar view={view} showGroup />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Mes groupes</h2>
        <ul className="divide-y divide-border-soft">
          {view.groups.map((g) => (
            <li key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
              <Link
                href={`/groupes/${g.id}/calendrier`}
                className="min-w-0 break-words font-medium text-text-primary hover:underline"
              >
                {g.name}
              </Link>
              <span className="text-text-secondary">Deadline : {formatDay(g.endDay)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
