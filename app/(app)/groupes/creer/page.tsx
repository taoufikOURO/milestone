import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { CreateGroupForm } from "@/components/group/forms";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Créer un groupe · Milestone" };

export default function CreerGroupePage() {
  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Créer un groupe" icon={Plus} />
      <Card>
        <p className="mb-4 text-sm text-text-secondary">
          Vous deviendrez le chef de ce groupe et pourrez inviter des étudiants de votre promo.
        </p>
        {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
        <Suspense fallback={<CardSkeleton />}>
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
