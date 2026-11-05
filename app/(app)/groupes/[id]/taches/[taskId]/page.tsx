import { ArrowLeft, ListChecks, Pencil, Trash2, TriangleAlert, UserCheck, Waypoints } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  DeleteTaskForm,
  TaskAssigneesForm,
  TaskDependenciesForm,
  TaskStatusForm,
  UpdateTaskForm,
} from "@/components/task/forms";
import { TaskStatusBadge, UnassignedBadge } from "@/components/task/status";
import { Alert } from "@/components/ui/Alert";
import { Card, CardTitle } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getTaskForMember } from "@/lib/services/task";

export const metadata: Metadata = { title: "Tâche · Milestone" };

export default function TaskPage({ params }: PageProps<"/groupes/[id]/taches/[taskId]">) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      {params.then(({ id, taskId }) => (
        <TaskContent groupId={id} taskId={taskId} />
      ))}
    </Suspense>
  );
}

const plural = (n: number) => (n > 1 ? "s" : "");

async function TaskContent({ groupId, taskId }: { groupId: string; taskId: string }) {
  const user = await requireVerifiedUser();
  // La tâche doit appartenir au groupe de l'URL et l'utilisateur en être membre.
  const view = await getTaskForMember(user, groupId, taskId);
  if (!view) notFound();
  const { task } = view;
  const isLeader = view.myRole === "leader";

  return (
    <div className="space-y-6">
      <Link
        href={`/groupes/${view.groupId}/taches`}
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-(--duration-fast) group-hover:-translate-x-0.5"
        />
        Toutes les tâches
      </Link>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-words font-display text-2xl font-extrabold tracking-tight text-text-primary">
            {task.title}
          </h2>
          <TaskStatusBadge status={task.status} />
          {task.isUnassigned ? <UnassignedBadge /> : null}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-text-secondary">Durée</dt>
          <dd className="text-text-primary">
            {task.durationDays} jour{plural(task.durationDays)}
          </dd>
          <dt className="text-text-secondary">Assignés</dt>
          <dd className="text-text-primary">
            {task.isUnassigned
              ? "Aucun"
              : task.assignees.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
          </dd>
          <dt className="text-text-secondary">Dépend de</dt>
          <dd className="text-text-primary">
            {task.dependsOn.length === 0 ? "Aucune tâche" : task.dependsOn.map((d) => d.title).join(", ")}
          </dd>
          <dt className="text-text-secondary">Bloque</dt>
          <dd className="text-text-primary">
            {task.dependents.length === 0 ? "Aucune tâche" : task.dependents.map((d) => d.title).join(", ")}
          </dd>
        </dl>
        {task.isUnassigned && isLeader ? (
          <Alert tone="error" icon={TriangleAlert}>
            Cette tâche n&apos;a aucun assigné : attribuez-la à un membre.
          </Alert>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <CardTitle icon={ListChecks}>Statut</CardTitle>
        <TaskStatusForm taskId={task.id} status={task.status} />
      </Card>

      {isLeader ? (
        <>
          <Card className="space-y-3">
            <CardTitle icon={Pencil}>Modifier</CardTitle>
            <UpdateTaskForm task={task} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <CardTitle icon={UserCheck}>Assignés</CardTitle>
              <TaskAssigneesForm
                taskId={task.id}
                members={view.members}
                selected={task.assignees.map((a) => a.id)}
              />
            </Card>
            <Card className="space-y-3">
              <CardTitle icon={Waypoints}>Dépendances</CardTitle>
              <TaskDependenciesForm
                taskId={task.id}
                candidates={view.otherTasks}
                selected={task.dependsOn.map((d) => d.id)}
              />
            </Card>
          </div>

          <Card tone="muted" className="space-y-3">
            <CardTitle icon={Trash2}>Supprimer la tâche</CardTitle>
            <DeleteTaskForm taskId={task.id} title={task.title} dependentCount={task.dependents.length} />
          </Card>
        </>
      ) : null}
    </div>
  );
}
