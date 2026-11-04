import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { JoinPromoForm } from "@/components/promo/forms";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Rejoindre une promo · Milestone" };

export default function RejoindrePromoPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Rejoindre une promo</h1>
      <Card>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-border-soft/60" />}>
          <RejoindreContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function RejoindreContent() {
  const user = await requireVerifiedUser();
  // Une seule promo à la fois (§4.2) : le service refuserait de toute façon.
  if (await findMyPromoId(user)) redirect("/promo");
  return <JoinPromoForm />;
}
