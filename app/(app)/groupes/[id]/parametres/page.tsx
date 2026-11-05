import { ArrowRightLeft, Settings, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteGroupForm, TransferLeadershipForm, UpdateGroupForm } from "@/components/group/forms";
import { Card, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Paramètres du groupe · Milestone" };

export default function GroupSettingsPage({ params }: PageProps<"/groupes/[id]/parametres">) {
  return (
    <Suspense fallback={<CardSkeleton />}>
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
        <CardTitle icon={Settings}>Informations</CardTitle>
        <UpdateGroupForm group={group} />
      </Card>

      <Card className="space-y-3">
        <CardTitle icon={ArrowRightLeft}>Nommer un successeur</CardTitle>
        <p className="text-sm text-text-secondary">Le membre choisi devient chef du groupe à votre place.</p>
        <TransferLeadershipForm groupId={group.id} candidates={others} />
      </Card>

      <Card tone="muted" className="space-y-3">
        <CardTitle icon={Trash2}>Supprimer le groupe</CardTitle>
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
