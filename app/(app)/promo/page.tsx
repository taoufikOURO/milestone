import { ArrowRight, CalendarRange, FolderKanban, KeyRound, LogOut, Settings, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PromoTimeline } from "@/components/calendar/PromoTimeline";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { LeavePromoForm } from "@/components/promo/forms";
import { PromoSkeleton } from "@/components/promo/PromoSkeleton";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PersonRow } from "@/components/ui/PersonRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatPromoCode } from "@/lib/promo-code";
import { getPromoCalendar } from "@/lib/services/calendar";
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
        <PageHeader title="Promo" icon={UsersRound} />
        <Card>
          <EmptyState
            icon={UsersRound}
            actions={
              <>
                <ButtonLink href="/promo/rejoindre">Rejoindre une promo</ButtonLink>
                <ButtonLink href="/promo/creer" variant="ghost">
                  Créer une promo
                </ButtonLink>
              </>
            }
          >
            Vous n&apos;êtes dans aucune promo.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const params = await searchParams;
  const isDelegate = promo.myRole === "delegate";

  return (
    <div className="space-y-6">
      <PageHeader
        title={promo.name}
        icon={UsersRound}
        actions={
          isDelegate ? (
            <ButtonLink href="/promo/gestion" variant="ghost">
              <Settings aria-hidden />
              Gestion de la promo
            </ButtonLink>
          ) : null
        }
      />

      {params.creee === "1" && isDelegate ? (
        <Alert tone="success">Promo créée. Partagez le code ci-dessous à votre classe.</Alert>
      ) : null}

      {promo.code ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-mono text-eyebrow uppercase text-muted">
              <KeyRound aria-hidden className="size-3.5 text-accent" />
              Code de la promo
            </h2>
            <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-text-primary">
              {formatPromoCode(promo.code)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">Visible par vous seul, en tant que délégué.</p>
          </div>
        </Card>
      ) : null}

      <Card className="min-w-0">
        <CardTitle icon={CalendarRange}>Calendrier de la promo</CardTitle>
        <Suspense fallback={<Skeleton className="mt-4 h-24" />}>
          <TimelineContent userId={user.id} emailVerifiedAt={user.emailVerifiedAt} promoId={promo.id} />
        </Suspense>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Card>
          <CardTitle icon={FolderKanban}>
            Groupes <span className="text-text-secondary">({promo.groups.length})</span>
          </CardTitle>
          {promo.groups.length === 0 ? (
            <EmptyState icon={FolderKanban} compact>
              Aucun groupe pour l&apos;instant.
            </EmptyState>
          ) : (
            <StaggerList className="mt-3 divide-y divide-line">
              {promo.groups.map((g) => (
                <StaggerItem key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    {g.isMember ? (
                      <Link
                        href={`/groupes/${g.id}`}
                        className="group flex items-center gap-1.5 truncate font-semibold text-text-primary hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span className="truncate">{g.name}</span>
                        <ArrowRight
                          aria-hidden
                          className="size-3.5 shrink-0 text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-accent"
                        />
                      </Link>
                    ) : (
                      <p className="truncate font-semibold text-text-primary">{g.name}</p>
                    )}
                    <p className="text-xs text-text-secondary">
                      {dateFormat.format(g.startDate)} → {dateFormat.format(g.endDate)} · {g.memberCount} membre
                      {g.memberCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  {g.isMember ? <Badge>Mon groupe</Badge> : null}
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </Card>
      </div>

      <Card tone="muted" className="space-y-3">
        <CardTitle icon={LogOut}>Quitter la promo</CardTitle>
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

async function TimelineContent({
  userId,
  emailVerifiedAt,
  promoId,
}: {
  userId: string;
  emailVerifiedAt: Date | null;
  promoId: string;
}) {
  const groups = await getPromoCalendar({ id: userId, emailVerifiedAt }, promoId);
  return <PromoTimeline groups={groups ?? []} />;
}
