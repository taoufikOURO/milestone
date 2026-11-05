import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { Suspense } from "react";
import { JoinPromoForm } from "@/components/promo/forms";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Rejoindre une promo · Milestone" };

export default function RejoindrePromoPage() {
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Rejoindre une promo" icon={LogIn} />
      <Card>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<CardSkeleton className="h-24" />}>
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
