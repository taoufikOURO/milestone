import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateGroupForm } from "@/components/group/forms";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Créer un groupe · Milestone" };

export default function CreerGroupePage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Créer un groupe</h1>
      <Card>
        <p className="mb-4 text-sm text-text-secondary">
          Vous deviendrez le chef de ce groupe et pourrez inviter des étudiants de votre promo.
        </p>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-border-soft/60" />}>
          <CreerContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function CreerContent() {
  const user = await requireVerifiedUser();
  // Sans promo : le service refuserait de toute façon.
  if (!(await findMyPromoId(user))) redirect("/promo");
  return <CreateGroupForm />;
}
