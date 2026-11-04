import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeletePromoForm, TransferDelegationForm } from "@/components/promo/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Gestion de « {promo.name} »</h1>

      <Card>
        <h2 className="text-sm font-semibold text-text-secondary">Code de la promo</h2>
        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-text-primary">
          {formatPromoCode(promo.code)}
        </p>
        <p className="mt-1 text-xs text-text-secondary">À partager à la classe pour qu&apos;elle rejoigne la promo.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-text-primary">
          Membres <span className="text-text-secondary">({promo.members.length})</span>
        </h2>
        <ul className="mt-3 divide-y divide-border-soft">
          {promo.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate text-text-primary">
                {m.firstName} {m.lastName} <span className="text-sm text-text-secondary">@{m.username}</span>
              </span>
              {m.role === "delegate" ? <Badge tone="accent">Délégué</Badge> : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Passation de la délégation</h2>
        <TransferDelegationForm promoId={promo.id} candidates={others} />
      </Card>

      <Card tone="muted" className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Supprimer la promo</h2>
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
