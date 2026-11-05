import { CalendarDays, Flag } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDay } from "@/lib/format";
import type { GroupCalendarView } from "@/lib/services/planning-view";

// Calendrier d'un groupe (§5.2) : seules les tâches de ce groupe, leurs
// assignés, leurs réunions et la deadline. Identique pour tous les membres.
export function GroupCalendar({ view }: { view: GroupCalendarView }) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <CardTitle
          icon={CalendarDays}
          aside={
            <p className="flex items-center gap-1.5 text-sm text-text-secondary">
              <Flag aria-hidden className="size-4 text-accent" />
              Deadline : <span className="font-semibold text-text-primary">{formatDay(view.group.endDay)}</span>
            </p>
          }
        >
          Planning
        </CardTitle>
        <MonthCalendar view={view} showGroup={false} />
      </Card>
    </div>
  );
}
