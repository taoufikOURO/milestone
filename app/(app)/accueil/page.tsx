import { ArrowRight, CalendarRange, FolderKanban, House, Inbox, Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { InvitationResponseForm } from "@/components/group/forms";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { listMyGroups } from "@/lib/services/group";
import { listMyPendingInvitations } from "@/lib/services/invitation";
import { findMyPromoId } from "@/lib/services/promo";

export const metadata: Metadata = { title: "Accueil · Milestone" };

export default function AccueilPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Accueil" icon={House} />
      {/* Lecture de la session et de la base sous <Suspense> (navigation instantanée). */}
      <Suspense fallback={<CardSkeleton />}>
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
    );
  }

  const [invitations, groups] = await Promise.all([listMyPendingInvitations(user), listMyGroups(user)]);

  return (
    <div className="space-y-6">
      {invitations.length > 0 ? (
        <Card className="space-y-3 border-accent/40">
          <CardTitle icon={Inbox} aside={<Badge tone="accent">{invitations.length}</Badge>}>
            Invitations en attente
          </CardTitle>
          <StaggerList className="divide-y divide-line">
            {invitations.map((i) => (
              <StaggerItem key={i.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary">{i.group.name}</p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-secondary">
                    <CalendarRange aria-hidden className="size-3.5" />
                    {formatDate(i.group.startDate)} <ArrowRight aria-hidden className="size-3" />{" "}
                    {formatDate(i.group.endDate)}
                    {i.leader ? ` · invité par ${i.leader.firstName} ${i.leader.lastName}` : null}
                  </p>
                </div>
                <InvitationResponseForm invitationId={i.id} />
              </StaggerItem>
            ))}
          </StaggerList>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <CardTitle
          icon={FolderKanban}
          aside={
            <ButtonLink href="/groupes/creer">
              <Plus aria-hidden />
              Créer un groupe
            </ButtonLink>
          }
        >
          Mes groupes <span className="text-text-secondary">({groups.length})</span>
        </CardTitle>
        {groups.length === 0 ? (
          <EmptyState icon={FolderKanban} compact>
            Vous n&apos;êtes membre d&apos;aucun groupe pour l&apos;instant.
          </EmptyState>
        ) : (
          <StaggerList className="divide-y divide-line">
            {groups.map((g) => (
              <StaggerItem key={g.id}>
                <Link
                  href={`/groupes/${g.id}`}
                  className="group -mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-3 transition-colors duration-(--duration-fast) hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-text-primary">{g.name}</p>
                    <p className="text-xs text-text-secondary">
                      Deadline {formatDate(g.endDate)} · {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {g.myRole === "leader" ? <Badge tone="accent">Chef</Badge> : null}
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </Card>
    </div>
  );
}
