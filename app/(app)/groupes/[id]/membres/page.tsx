import { LogOut, MailPlus, UserPlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelInvitationForm, InviteForm, LeaveGroupForm } from "@/components/group/forms";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PersonRow } from "@/components/ui/PersonRow";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Membres du groupe · Milestone" };

export default function GroupMembersPage({ params }: PageProps<"/groupes/[id]/membres">) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      {params.then(({ id }) => (
        <MembersContent groupId={id} />
      ))}
    </Suspense>
  );
}

async function MembersContent({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  const group = await getGroupForMember(user, groupId);
  if (!group) notFound();
  const isLeader = group.myRole === "leader";
  const others = group.members.filter((m) => m.id !== user.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={UsersRound}>
            Membres <span className="text-text-secondary">({group.members.length})</span>
          </CardTitle>
          <StaggerList className="mt-3 divide-y divide-line">
            {group.members.map((m) => (
              <PersonRow
                key={m.id}
                firstName={m.firstName}
                lastName={m.lastName}
                username={m.username}
                badge={m.role === "leader" ? <Badge tone="accent">Chef</Badge> : null}
              />
            ))}
          </StaggerList>
        </Card>

        <Card className="space-y-4">
          <CardTitle icon={MailPlus}>Invitations en attente</CardTitle>
          {group.pendingInvitations.length === 0 ? (
            <EmptyState icon={MailPlus} compact>
              Aucune invitation en attente.
            </EmptyState>
          ) : (
            <StaggerList className="divide-y divide-line">
              {group.pendingInvitations.map((i) => (
                <StaggerItem key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-text-primary">
                      {i.user.firstName} {i.user.lastName}{" "}
                      <span className="text-sm text-text-secondary">@{i.user.username}</span>
                    </p>
                    <p className="text-xs text-text-secondary">Invité le {formatDate(i.createdAt)}</p>
                  </div>
                  {isLeader ? (
                    <CancelInvitationForm invitationId={i.id} label={`${i.user.firstName} ${i.user.lastName}`} />
                  ) : null}
                </StaggerItem>
              ))}
            </StaggerList>
          )}
          {isLeader ? (
            <div className="space-y-3 border-t border-line pt-4">
              <CardTitle icon={UserPlus} level={3}>
                Inviter un étudiant
              </CardTitle>
              <InviteForm groupId={group.id} />
            </div>
          ) : null}
        </Card>
      </div>

      <Card tone="muted" className="space-y-3">
        <CardTitle icon={LogOut}>Quitter le groupe</CardTitle>
        <LeaveGroupForm groupId={group.id} groupName={group.name} isLeader={isLeader} candidates={others} />
      </Card>
    </div>
  );
}
