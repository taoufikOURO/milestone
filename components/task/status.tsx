import { Badge } from "@/components/ui/Badge";
import type { TaskStatusName } from "@/lib/validation/task";

export const TASK_STATUS_LABELS: Record<TaskStatusName, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminée",
};

const TONES = { todo: "neutral", in_progress: "accent", done: "dark" } as const;

export function TaskStatusBadge({ status }: { status: TaskStatusName }) {
  return <Badge tone={TONES[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

/** Tâche sans assigné (§6.5) : le chef doit l'attribuer. */
export function UnassignedBadge() {
  return (
    <Badge tone="accent" className="border border-accent/40">
      Non assignée
    </Badge>
  );
}
