import { ChartNoAxesColumn, ListChecks, Plus, Users, Waypoints } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StaggerItem, StaggerList } from "@/components/motion/Stagger";
import { CreateTaskForm } from "@/components/task/forms";
import { TaskStatusBadge, UnassignedBadge } from "@/components/task/status";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getGroupTasks } from "@/lib/services/task";

export const metadata: Metadata = { title: "Tâches du groupe · Milestone" };

export default function GroupTasksPage({ params }: PageProps<"/groupes/[id]/taches">) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      {params.then(({ id }) => (
        <TasksContent groupId={id} />
      ))}
    </Suspense>
  );
}

const plural = (n: number) => (n > 1 ? "s" : "");

async function TasksContent({ groupId }: { groupId: string }) {
  const user = await requireVerifiedUser();
  const view = await getGroupTasks(user, groupId);
  if (!view) notFound();
  const isLeader = view.myRole === "leader";

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <CardTitle icon={ChartNoAxesColumn}>Avancement</CardTitle>
          <span className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
            {view.progressPercent} %
          </span>
        </div>
        <ProgressBar value={view.progressPercent} label="Avancement du groupe" />
        <p className="text-xs text-text-secondary">
          Au prorata des jours des tâches terminées, sans la marge. Une tâche en cours compte pour 0 %.
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle
          icon={ListChecks}
          aside={
            view.unassignedCount > 0 ? (
              <Badge tone="accent">
                {view.unassignedCount} non assignée{plural(view.unassignedCount)}
              </Badge>
            ) : null
          }
        >
          Tâches <span className="text-text-secondary">({view.tasks.length})</span>
        </CardTitle>
        {view.tasks.length === 0 ? (
          <EmptyState icon={ListChecks} compact>
            Aucune tâche pour l&apos;instant.{isLeader ? " Créez la première ci-dessous." : ""}
          </EmptyState>
        ) : (
          <StaggerList className="divide-y divide-line">
            {view.tasks.map((t) => (
              <StaggerItem key={t.id} className="py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/groupes/${view.groupId}/taches/${t.id}`}
                    className="min-w-0 break-words font-semibold text-text-primary hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {t.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isUnassigned ? <UnassignedBadge /> : null}
                    <TaskStatusBadge status={t.status} />
                  </div>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-text-secondary">
                  {t.durationDays} jour{plural(t.durationDays)}
                  {t.assignees.length > 0 ? (
                    <>
                      <Users aria-hidden className="size-3.5" />
                      {t.assignees.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
                    </>
                  ) : null}
                </p>
                {t.dependsOn.length > 0 ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-secondary">
                    <Waypoints aria-hidden className="size-3.5" />
                    Dépend de : {t.dependsOn.map((d) => d.title).join(", ")}
                  </p>
                ) : null}
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </Card>

      {isLeader ? (
        <Card className="space-y-3">
          <CardTitle icon={Plus}>Nouvelle tâche</CardTitle>
          <CreateTaskForm groupId={view.groupId} members={view.members} tasks={view.tasks} />
        </Card>
      ) : null}
    </div>
  );
}
