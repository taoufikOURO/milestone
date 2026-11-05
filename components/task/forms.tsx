"use client";

import { useActionState } from "react";
import { ConfirmedForm } from "@/components/promo/forms";
import { TASK_STATUS_LABELS } from "@/components/task/status";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createTaskAction,
  deleteTaskAction,
  setTaskAssigneesAction,
  setTaskDependenciesAction,
  setTaskStatusAction,
  updateTaskAction,
  type TaskFormState,
} from "@/lib/actions/task";
import { MAX_DURATION_DAYS, TASK_STATUSES, type TaskStatusName } from "@/lib/validation/task";

// Ces formulaires ne sont qu'une interface : le service revérifie les droits
// (chef pour l'édition, membre pour le statut) à chaque appel.

type Person = { id: string; username: string; firstName: string; lastName: string };
type TaskRef = { id: string; title: string };
type Option = { id: string; label: string };

const initial: TaskFormState = {};

const personOption = (p: Person): Option => ({ id: p.id, label: `${p.firstName} ${p.lastName} (@${p.username})` });
const taskOption = (t: TaskRef): Option => ({ id: t.id, label: t.title });

function Feedback({ state }: { state: TaskFormState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

function CheckboxList({
  legend,
  name,
  options,
  selected = [],
  emptyText,
}: {
  legend: string;
  name: string;
  options: Option[];
  selected?: string[];
  emptyText: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-text-primary">{legend}</legend>
      {options.length === 0 ? (
        <p className="mt-1.5 text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <ul className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto rounded-control border border-border-soft bg-surface-raised p-1.5 shadow-hairline">
          {options.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 text-sm text-text-primary transition-colors duration-(--duration-fast) hover:bg-surface">
                <input
                  type="checkbox"
                  name={name}
                  value={o.id}
                  defaultChecked={selected.includes(o.id)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0 break-words">{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function TaskFields({ state, defaults }: { state: TaskFormState; defaults?: { title: string; durationDays: number } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
      <Input
        label="Titre"
        name="title"
        required
        maxLength={200}
        defaultValue={state.values?.title ?? defaults?.title}
        error={state.errors?.title}
      />
      <Input
        label="Durée (jours)"
        name="durationDays"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_DURATION_DAYS}
        step={1}
        required
        defaultValue={state.values?.durationDays ?? (defaults ? String(defaults.durationDays) : undefined)}
        error={state.errors?.durationDays}
        hint="Jours calendaires, cours inclus."
      />
    </div>
  );
}

export function CreateTaskForm({ groupId, members, tasks }: { groupId: string; members: Person[]; tasks: TaskRef[] }) {
  const [state, action, pending] = useActionState(createTaskAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <TaskFields state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxList
          legend="Assignés"
          name="assigneeIds"
          options={members.map(personOption)}
          emptyText="Aucun membre."
        />
        <CheckboxList
          legend="Dépend de"
          name="dependsOnIds"
          options={tasks.map(taskOption)}
          emptyText="Aucune autre tâche pour l'instant."
        />
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Créer la tâche"}
      </Button>
    </form>
  );
}

export function UpdateTaskForm({ task }: { task: { id: string; title: string; durationDays: number } }) {
  const [state, action, pending] = useActionState(updateTaskAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={task.id} />
      <TaskFields state={state} defaults={task} />
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Patientez…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function TaskAssigneesForm({
  taskId,
  members,
  selected,
}: {
  taskId: string;
  members: Person[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState(setTaskAssigneesAction, initial);
  return (
    // La clé remonte le formulaire quand les assignés changent en base.
    <form key={selected.join(",")} action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      <CheckboxList
        legend="Membres assignés"
        name="assigneeIds"
        options={members.map(personOption)}
        selected={selected}
        emptyText="Aucun membre."
      />
      <Feedback state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Patientez…" : "Enregistrer les assignés"}
      </Button>
    </form>
  );
}

export function TaskDependenciesForm({
  taskId,
  candidates,
  selected,
}: {
  taskId: string;
  candidates: TaskRef[];
  selected: string[];
}) {
  const [state, action, pending] = useActionState(setTaskDependenciesAction, initial);
  return (
    <form key={selected.join(",")} action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      <CheckboxList
        legend="Cette tâche dépend de"
        name="dependsOnIds"
        options={candidates.map(taskOption)}
        selected={selected}
        emptyText="Aucune autre tâche dans ce groupe."
      />
      <Feedback state={state} />
      <Button type="submit" variant="secondary" disabled={pending || candidates.length === 0}>
        {pending ? "Patientez…" : "Enregistrer les dépendances"}
      </Button>
    </form>
  );
}

export function TaskStatusForm({ taskId, status }: { taskId: string; status: TaskStatusName }) {
  const [state, action, pending] = useActionState(setTaskStatusAction, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="taskId" value={taskId} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Statut de la tâche">
        {TASK_STATUSES.map((s) => (
          <Button
            key={s}
            type="submit"
            name="status"
            value={s}
            variant={s === status ? "primary" : "ghost"}
            aria-pressed={s === status}
            disabled={pending || s === status}
          >
            {TASK_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function DeleteTaskForm({
  taskId,
  title,
  dependentCount,
}: {
  taskId: string;
  title: string;
  dependentCount: number;
}) {
  const [state, action, pending] = useActionState(deleteTaskAction, initial);
  const plural = dependentCount > 1 ? "s" : "";
  return (
    <ConfirmedForm
      action={action}
      pending={pending}
      triggerLabel="Supprimer la tâche"
      title={`Supprimer « ${title} » ?`}
      description={
        <ul className="list-disc space-y-1 pl-5">
          <li>Ses assignations, dépendances et sa réunion éventuelle sont supprimées.</li>
          {dependentCount > 0 ? (
            <li>
              {dependentCount} tâche{plural} ne dépendr{dependentCount > 1 ? "ont" : "a"} plus d&apos;elle.
            </li>
          ) : null}
          <li>Cette action est définitive.</li>
        </ul>
      }
      confirmLabel="Supprimer définitivement"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <Feedback state={state} />
    </ConfirmedForm>
  );
}
