import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { CreatePromoForm } from "@/components/promo/forms";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Créer une promo · Milestone" };

export default function CreerPromoPage() {
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Créer une promo" icon={Plus} />
      <Card>
        <p className="mb-4 text-sm text-text-secondary">
          Vous deviendrez le délégué de cette promo et recevrez un code à partager à votre classe.
        </p>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<CardSkeleton className="h-24" />}>
          <CreerContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function CreerContent() {
  const user = await requireVerifiedUser();
  // Déjà dans une promo : le service refuserait de toute façon.
  if (await findMyPromoId(user)) redirect("/promo");
  return <CreatePromoForm />;
}
