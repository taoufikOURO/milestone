import { CalendarDays, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PersonalCalendar } from "@/components/calendar/PersonalCalendar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getPersonalCalendar } from "@/lib/services/planning";

export const metadata: Metadata = { title: "Mon calendrier · Milestone" };

export default function MonCalendrierPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mon calendrier" icon={CalendarDays} />
      <Suspense fallback={<CardSkeleton className="h-64" />}>
        <PersonalContent />
      </Suspense>
    </div>
  );
}

async function PersonalContent() {
  const user = await requireVerifiedUser();
  const view = await getPersonalCalendar(user);
  if (!view) {
    return (
      <Card>
        <EmptyState icon={UsersRound} actions={<ButtonLink href="/promo/rejoindre">Rejoindre une promo</ButtonLink>}>
          Rejoignez une promo pour voir votre calendrier.
        </EmptyState>
      </Card>
    );
  }
  return <PersonalCalendar view={view} />;
}
