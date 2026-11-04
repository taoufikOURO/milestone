import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Groupe · Milestone" };

export default function GroupPage({ params }: PageProps<"/groupes/[id]">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border-soft/60" />}>
      {params.then(({ id }) => (
        <GroupOverview groupId={id} />
      ))}
    </Suspense>
  );
}

async function GroupOverview({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  // Revérifié ici : la page ne s'appuie pas sur le contrôle du layout.
  const group = await getGroupForMember(user, groupId);
  if (!group) notFound();
  const plural = (n: number) => (n > 1 ? "s" : "");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-2">
        <h2 className="text-lg font-bold text-text-primary">Projet</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-secondary">Début</dt>
          <dd className="text-text-primary">{formatDate(group.startDate)}</dd>
          <dt className="text-text-secondary">Deadline</dt>
          <dd className="font-semibold text-text-primary">{formatDate(group.endDate)}</dd>
          <dt className="text-text-secondary">Marge</dt>
          <dd className="text-text-primary">{group.marginPercent} %</dd>
          <dt className="text-text-secondary">Membres</dt>
          <dd className="text-text-primary">{group.members.length}</dd>
        </dl>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-text-primary">Avancement</h2>
          <span className="text-2xl font-bold text-text-primary">{group.progressPercent} %</span>
        </div>
        <ProgressBar value={group.progressPercent} label="Avancement du groupe" />
        <p className="text-sm text-text-secondary">
          {group.taskCount} tâche{plural(group.taskCount)} dans ce groupe.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {group.unassignedTaskCount > 0 ? (
            <Badge tone="accent">
              {group.unassignedTaskCount} tâche{plural(group.unassignedTaskCount)} non assignée
              {plural(group.unassignedTaskCount)}
            </Badge>
          ) : null}
          <Link href={`/groupes/${group.id}/taches`} className="text-sm font-semibold text-accent hover:underline">
            Voir les tâches →
          </Link>
        </div>
      </Card>
    </div>
  );
}
