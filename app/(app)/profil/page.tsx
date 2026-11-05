import { IdCard, LockKeyhole, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm, ProfileForm } from "@/components/profile/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader title="Profil" icon={UserRound} />

      <Card className="space-y-5">
        <CardTitle icon={IdCard}>Informations</CardTitle>
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4">
          <Avatar firstName={user.firstName} lastName={user.lastName} />
          <dl className="grid min-w-0 flex-1 gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="font-mono text-eyebrow uppercase text-muted">Nom d&apos;utilisateur</dt>
              <dd className="mt-1 break-words text-text-primary">
                @{user.username} <span className="text-xs text-text-secondary">(non modifiable)</span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-mono text-eyebrow uppercase text-muted">Email</dt>
              <dd className="mt-1 break-words text-text-primary">{user.email}</dd>
            </div>
          </dl>
        </div>
        <ProfileForm firstName={user.firstName} lastName={user.lastName} />
      </Card>

      <Card className="space-y-4">
        <CardTitle icon={LockKeyhole}>Mot de passe</CardTitle>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}
