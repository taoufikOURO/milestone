import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InvitationResponseForm } from "@/components/group/forms";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { listMyGroups } from "@/lib/services/group";
import { listMyPendingInvitations } from "@/lib/services/invitation";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Accueil · Milestone" };

export default function AccueilPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Accueil</h1>
      {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border-soft/60" />}>
        <AccueilContent />
      </Suspense>
    </div>
  );
}

async function AccueilContent() {
  const user = await requireVerifiedUser();
  const promoId = await findMyPromoId(user);

  if (!promoId) {
    return (
      <Card className="space-y-4">
        <p className="text-text-secondary">Vous n&apos;êtes dans aucune promo.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/promo/rejoindre">Rejoindre une promo</ButtonLink>
          <ButtonLink href="/promo/creer" variant="ghost">
            Créer une promo
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const [invitations, groups] = await Promise.all([listMyPendingInvitations(user), listMyGroups(user)]);

  return (
    <div className="space-y-6">
      {invitations.length > 0 ? (
        <Card className="space-y-3 border-accent/50">
          <h2 className="text-lg font-bold text-text-primary">
            Invitations en attente <Badge tone="accent">{invitations.length}</Badge>
          </h2>
          <ul className="divide-y divide-border-soft">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{i.group.name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(i.group.startDate)} → {formatDate(i.group.endDate)}
                    {i.leader ? ` · invité par ${i.leader.firstName} ${i.leader.lastName}` : null}
                  </p>
                </div>
                <InvitationResponseForm invitationId={i.id} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            Mes groupes <span className="text-text-secondary">({groups.length})</span>
          </h2>
          <ButtonLink href="/groupes/creer">Créer un groupe</ButtonLink>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-text-secondary">Vous n&apos;êtes membre d&apos;aucun groupe pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groupes/${g.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg py-2 hover:bg-border-soft/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">{g.name}</p>
                    <p className="text-xs text-text-secondary">
                      Deadline {formatDate(g.endDate)} · {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  {g.myRole === "leader" ? <Badge tone="accent">Chef</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
