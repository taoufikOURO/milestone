import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm, ProfileForm } from "@/components/profile/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Profil · Milestone" };

// Lecture de la session et de la base sous <Suspense> (navigation instantanée).
export default function ProfilPage() {
  return (
    <Suspense fallback={<PromoSkeleton />}>
      <ProfilContent />
    </Suspense>
  );
}

async function ProfilContent() {
  const user = await requireVerifiedUser();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Profil</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Informations</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-text-secondary">Nom d&apos;utilisateur</dt>
            <dd className="mt-1 text-text-primary">
              @{user.username} <span className="text-xs text-text-secondary">(non modifiable)</span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-text-secondary">Email</dt>
            <dd className="mt-1 text-text-primary">{user.email}</dd>
          </div>
        </dl>
        <ProfileForm firstName={user.firstName} lastName={user.lastName} />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Mot de passe</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
