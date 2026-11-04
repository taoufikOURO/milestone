import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/auth/ui";
import { LeavePromoForm } from "@/components/promo/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatPromoCode } from "@/lib/promo-code";
import { findMyPromoId, getPromoOverview } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Promo · Milestone" };

// Dates de groupe : colonnes DATE, lues à minuit UTC.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Le rendu principal ne lit ni la session ni la base : la lecture se fait dans
// PromoContent, sous <Suspense>, pour que la navigation affiche le squelette
// immédiatement (Cache Components, navigation instantanée).
export default function PromoPage({ searchParams }: PageProps<"/promo">) {
  return (
    <Suspense fallback={<PromoSkeleton />}>
      <PromoContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PromoContent({ searchParams }: Pick<PageProps<"/promo">, "searchParams">) {
  const user = await requireVerifiedUser();
  const promoId = await findMyPromoId(user);
  const promo = promoId ? await getPromoOverview(user, promoId) : null;

  if (!promo) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Promo</h1>
        <Card className="space-y-4">
          <p className="text-text-secondary">Vous n&apos;êtes dans aucune promo.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/promo/rejoindre">Rejoindre une promo</ButtonLink>
            <ButtonLink href="/promo/creer" variant="ghost">
              Créer une promo
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const isDelegate = promo.myRole === "delegate";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{promo.name}</h1>
        {isDelegate ? (
          <ButtonLink href="/promo/gestion" variant="ghost">
            Gestion de la promo
          </ButtonLink>
        ) : null}
      </div>

      {params.creee === "1" && isDelegate ? (
        <Alert tone="info">Promo créée. Partagez le code ci-dessous à votre classe.</Alert>
      ) : null}

      {promo.code ? (
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary">Code de la promo</h2>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-text-primary">
            {formatPromoCode(promo.code)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Visible par vous seul, en tant que délégué.</p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Card>
          <h2 className="text-lg font-bold text-text-primary">
            Groupes <span className="text-text-secondary">({promo.groups.length})</span>
          </h2>
          {promo.groups.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Aucun groupe pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border-soft">
              {promo.groups.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    {g.isMember ? (
                      <Link href={`/groupes/${g.id}`} className="block truncate font-medium text-text-primary hover:text-accent">
                        {g.name}
                      </Link>
                    ) : (
                      <p className="truncate font-medium text-text-primary">{g.name}</p>
                    )}
                    <p className="text-xs text-text-secondary">
                      {dateFormat.format(g.startDate)} → {dateFormat.format(g.endDate)} · {g.memberCount} membre
                      {g.memberCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  {g.isMember ? <Badge>Mon groupe</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card tone="muted" className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Quitter la promo</h2>
        <LeavePromoForm
          isDelegate={isDelegate}
          delegateCandidates={promo.members.filter((m) => m.id !== user.id)}
          ledGroups={promo.leave.ledGroups}
          soloGroups={promo.leave.soloGroups}
        />
      </Card>
    </div>
  );
}
