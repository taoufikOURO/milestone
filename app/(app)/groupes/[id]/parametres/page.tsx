import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteGroupForm, TransferLeadershipForm, UpdateGroupForm } from "@/components/group/forms";
import { Card } from "@/components/ui/Card";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Paramètres du groupe · Milestone" };

export default function GroupSettingsPage({ params }: PageProps<"/groupes/[id]/parametres">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border-soft/60" />}>
      {params.then(({ id }) => (
        <SettingsContent groupId={id} />
      ))}
    </Suspense>
  );
}

async function SettingsContent({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  const group = await getGroupForMember(user, groupId);
  if (!group) notFound();
  // Page réservée au chef. Les actions revérifient le rôle côté serveur.
  if (group.myRole !== "leader") redirect(`/groupes/${group.id}`);
  const others = group.members.filter((m) => m.id !== user.id);

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Informations</h2>
        <UpdateGroupForm group={group} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Nommer un successeur</h2>
        <p className="text-sm text-text-secondary">Le membre choisi devient chef du groupe à votre place.</p>
        <TransferLeadershipForm groupId={group.id} candidates={others} />
      </Card>

      <Card tone="muted" className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary">Supprimer le groupe</h2>
        <p className="text-sm text-text-secondary">
          Le groupe et toutes ses données sont supprimés pour tous les membres.
        </p>
        <DeleteGroupForm
          groupId={group.id}
          groupName={group.name}
          memberCount={group.members.length}
          taskCount={group.taskCount}
        />
      </Card>
    </div>
  );
}
