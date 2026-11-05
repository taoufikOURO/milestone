import { ArrowRight, ChartNoAxesColumn, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getGroupForMember } from "@/lib/services/group";

export const metadata: Metadata = { title: "Groupe · Milestone" };

export default function GroupPage({ params }: PageProps<"/groupes/[id]">) {
  return (
    <Suspense fallback={<CardSkeleton />}>
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
        <CardTitle icon={ClipboardList}>Projet</CardTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 pt-2 text-sm">
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <CardTitle icon={ChartNoAxesColumn}>Avancement</CardTitle>
          <span className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
            {group.progressPercent} %
          </span>
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
          <Link
            href={`/groupes/${group.id}/taches`}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Voir les tâches
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </Card>
    </div>
  );
}
