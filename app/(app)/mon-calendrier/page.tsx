import type { Metadata } from "next";
import { Suspense } from "react";
import { PersonalCalendar } from "@/components/calendar/PersonalCalendar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getPersonalCalendar } from "@/lib/services/planning";

export const metadata: Metadata = { title: "Mon calendrier · Milestone" };

export default function MonCalendrierPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Mon calendrier</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-border-soft/60" />}>
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
      <Card className="space-y-4">
        <p className="text-text-secondary">Rejoignez une promo pour voir votre calendrier.</p>
        <ButtonLink href="/promo/rejoindre">Rejoindre une promo</ButtonLink>
      </Card>
    );
  }
  return <PersonalCalendar view={view} />;
}
