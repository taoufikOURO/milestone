import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreatePromoForm } from "@/components/promo/forms";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Créer une promo · Milestone" };

export default function CreerPromoPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Créer une promo</h1>
      <Card>
        <p className="mb-4 text-sm text-text-secondary">
          Vous deviendrez le délégué de cette promo et recevrez un code à partager à votre classe.
        </p>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-border-soft/60" />}>
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
