import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GroupCalendar } from "@/components/calendar/GroupCalendar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getGroupCalendar } from "@/lib/services/planning";

export const metadata: Metadata = { title: "Calendrier du groupe · Milestone" };

export default function GroupCalendarPage({ params }: PageProps<"/groupes/[id]/calendrier">) {
  return (
    <Suspense fallback={<CardSkeleton className="h-64" />}>
      {params.then(({ id }) => (
        <CalendarContent groupId={id} />
      ))}
    </Suspense>
  );
}

async function CalendarContent({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  // Revérifié par le service : membre du groupe uniquement.
  const view = await getGroupCalendar(user, groupId);
  if (!view) notFound();
  return <GroupCalendar view={view} />;
}
