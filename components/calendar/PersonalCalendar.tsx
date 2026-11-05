import { ArrowRight, CalendarDays, FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDay } from "@/lib/format";
import type { CalendarView } from "@/lib/services/planning-view";

// « Mon calendrier » (§5.3) : les tâches et réunions de l'étudiant dans tous
// ses groupes, sur une seule frise, et les conflits de tous ses groupes, y
// compris les tâches non assignées.
export function PersonalCalendar({ view }: { view: CalendarView }) {
  if (view.groups.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FolderKanban}
          actions={
            <ButtonLink href="/groupes/creer">
              <Plus aria-hidden />
              Créer un groupe
            </ButtonLink>
          }
        >
          Vous n&apos;êtes dans aucun groupe.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardTitle icon={CalendarDays}>Mon calendrier</CardTitle>
        <MonthCalendar view={view} showGroup />
      </Card>

      <Card className="space-y-3">
        <CardTitle icon={FolderKanban}>Mes groupes</CardTitle>
        <StaggerList className="divide-y divide-line">
          {view.groups.map((g) => (
            <StaggerItem key={g.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
              <Link
                href={`/groupes/${g.id}/calendrier`}
                className="group inline-flex min-w-0 items-center gap-1.5 break-words font-semibold text-text-primary hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                {g.name}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </Link>
              <span className="text-text-secondary">Deadline : {formatDay(g.endDay)}</span>
            </StaggerItem>
          ))}
        </StaggerList>
      </Card>
    </div>
  );
}
