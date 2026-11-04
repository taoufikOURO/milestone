import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Card } from "@/components/ui/Card";
import { formatDay } from "@/lib/format";
import type { GroupCalendarView } from "@/lib/services/planning-view";

// Calendrier d'un groupe (§5.2) : seules les tâches de ce groupe, leurs
// assignés, leurs réunions et la deadline. Identique pour tous les membres.
export function GroupCalendar({ view }: { view: GroupCalendarView }) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-text-primary">Planning</h2>
          <p className="text-sm text-text-secondary">
            Deadline : <span className="font-semibold text-text-primary">{formatDay(view.group.endDay)}</span>
          </p>
        </div>
        <MonthCalendar view={view} showGroup={false} />
      </Card>
    </div>
  );
}
