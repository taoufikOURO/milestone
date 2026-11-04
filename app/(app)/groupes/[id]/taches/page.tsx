import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CreateTaskForm } from "@/components/task/forms";
import { TaskStatusBadge, UnassignedBadge } from "@/components/task/status";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getGroupTasks } from "@/lib/services/task";

export const metadata: Metadata = { title: "Tâches du groupe · Milestone" };

export default function GroupTasksPage({ params }: PageProps<"/groupes/[id]/taches">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border-soft/60" />}>
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-text-primary">Avancement</h2>
          <span className="text-2xl font-bold text-text-primary">{view.progressPercent} %</span>
        </div>
        <ProgressBar value={view.progressPercent} label="Avancement du groupe" />
        <p className="text-xs text-text-secondary">
          Au prorata des jours des tâches terminées, sans la marge. Une tâche en cours compte pour 0 %.
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-text-primary">
            Tâches <span className="text-text-secondary">({view.tasks.length})</span>
          </h2>
          {view.unassignedCount > 0 ? (
            <Badge tone="accent">
              {view.unassignedCount} non assignée{plural(view.unassignedCount)}
            </Badge>
          ) : null}
        </div>
        {view.tasks.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Aucune tâche pour l&apos;instant.{isLeader ? " Créez la première ci-dessous." : ""}
          </p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {view.tasks.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/groupes/${view.groupId}/taches/${t.id}`}
                    className="min-w-0 break-words font-semibold text-text-primary hover:text-accent"
                  >
                    {t.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isUnassigned ? <UnassignedBadge /> : null}
                    <TaskStatusBadge status={t.status} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {t.durationDays} jour{plural(t.durationDays)}
                  {t.assignees.length > 0
                    ? ` · ${t.assignees.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}`
                    : ""}
                </p>
                {t.dependsOn.length > 0 ? (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Dépend de : {t.dependsOn.map((d) => d.title).join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isLeader ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Nouvelle tâche</h2>
          <CreateTaskForm groupId={view.groupId} members={view.members} tasks={view.tasks} />
        </Card>
      ) : null}
    </div>
  );
}
