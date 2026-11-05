import { ArrowRightLeft, KeyRound, Settings, Trash2, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StaggerList } from "@/components/motion/Stagger";
import { DeletePromoForm, TransferDelegationForm } from "@/components/promo/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonRow } from "@/components/ui/PersonRow";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatPromoCode } from "@/lib/promo-code";
import { findMyPromoId, getPromoOverview } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Gestion de la promo · Milestone" };

// Lecture de la session et de la base sous <Suspense> (navigation instantanée).
export default function GestionPromoPage() {
  return (
    <Suspense fallback={<PromoSkeleton />}>
      <GestionContent />
    </Suspense>
  );
}

async function GestionContent() {
  const user = await requireVerifiedUser();
  const promoId = await findMyPromoId(user);
  const promo = promoId ? await getPromoOverview(user, promoId) : null;
  // Page réservée au délégué. Les actions revérifient le rôle côté serveur.
  if (!promo || promo.myRole !== "delegate" || !promo.code) redirect("/promo");

  const others = promo.members.filter((m) => m.id !== user.id);

  return (
    <div className="space-y-6">
      <PageHeader title={<>Gestion de « {promo.name} »</>} icon={Settings} />

      <Card>
        <h2 className="flex items-center gap-2 font-mono text-eyebrow uppercase text-muted">
          <KeyRound aria-hidden className="size-3.5 text-accent" />
          Code de la promo
        </h2>
        <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-text-primary">
          {formatPromoCode(promo.code)}
        </p>
        <p className="mt-1 text-xs text-text-secondary">À partager à la classe pour qu&apos;elle rejoigne la promo.</p>
      </Card>

      <Card>
        <CardTitle icon={UsersRound}>
          Membres <span className="text-text-secondary">({promo.members.length})</span>
        </CardTitle>
        <StaggerList className="mt-3 divide-y divide-line">
          {promo.members.map((m) => (
            <PersonRow
              key={m.id}
              firstName={m.firstName}
              lastName={m.lastName}
              username={m.username}
              badge={m.role === "delegate" ? <Badge tone="accent">Délégué</Badge> : null}
            />
          ))}
        </StaggerList>
      </Card>

      <Card className="space-y-3">
        <CardTitle icon={ArrowRightLeft}>Passation de la délégation</CardTitle>
        <TransferDelegationForm promoId={promo.id} candidates={others} />
      </Card>

      <Card tone="muted" className="space-y-3">
        <CardTitle icon={Trash2}>Supprimer la promo</CardTitle>
        <p className="text-sm text-text-secondary">
          Tous les membres quittent la promo et tous ses groupes sont supprimés, avec leurs données.
        </p>
        <DeletePromoForm
          promoId={promo.id}
          promoName={promo.name}
          memberCount={promo.members.length}
          groupCount={promo.groups.length}
        />
      </Card>
    </div>
  );
}
