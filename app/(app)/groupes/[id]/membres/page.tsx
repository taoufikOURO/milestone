import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CancelInvitationForm, InviteForm, LeaveGroupForm } from "@/components/group/forms";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Membres du groupe · Milestone" };

export default function GroupMembersPage({ params }: PageProps<"/groupes/[id]/membres">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border-soft/60" />}>
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
          <h2 className="text-lg font-bold text-text-primary">
            Membres <span className="text-text-secondary">({group.members.length})</span>
          </h2>
          <ul className="mt-3 divide-y divide-border-soft">
            {group.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-text-primary">
                  {m.firstName} {m.lastName} <span className="text-sm text-text-secondary">@{m.username}</span>
                </span>
                {m.role === "leader" ? <Badge tone="accent">Chef</Badge> : null}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary">Invitations en attente</h2>
          {group.pendingInvitations.length === 0 ? (
            <p className="text-sm text-text-secondary">Aucune invitation en attente.</p>
          ) : (
            <ul className="divide-y divide-border-soft">
              {group.pendingInvitations.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
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
                </li>
              ))}
            </ul>
          )}
          {isLeader ? (
            <div className="border-t border-border-soft pt-4">
              <h3 className="mb-3 font-semibold text-text-primary">Inviter un étudiant</h3>
              <InviteForm groupId={group.id} />
            </div>
          ) : null}
        </Card>
      </div>

      <Card tone="muted" className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Quitter le groupe</h2>
        <LeaveGroupForm groupId={group.id} groupName={group.name} isLeader={isLeader} candidates={others} />
      </Card>
    </div>
  );
}
