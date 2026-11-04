"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/auth/guards";
import {
  createTask,
  deleteTask,
  setTaskAssignees,
  setTaskDependencies,
  setTaskStatus,
  TASK_ERROR_MESSAGES,
  updateTask,
} from "@/lib/services/task";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  createTaskSchema,
  taskAssigneesSchema,
  taskDependenciesSchema,
  taskIdSchema,
  taskStatusSchema,
  updateTaskSchema,
} from "@/lib/validation/task";

// Les actions valident l'entrée (Zod) puis délèguent au service, qui vérifie
// les droits sur le groupe de la tâche. L'utilisateur vient de la session.

export type TaskFormState = {
  errors?: FieldErrors;
  error?: string;
  success?: string;
  values?: Record<string, string>;
};

const INVALID_REQUEST = "Requête invalide. Rechargez la page et réessayez.";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

const strs = (formData: FormData, key: string): string[] =>
  formData.getAll(key).filter((v): v is string => typeof v === "string");

export async function createTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const values = { title: str(formData, "title"), durationDays: str(formData, "durationDays") };
  const parsed = createTaskSchema.safeParse({
    ...values,
    groupId: str(formData, "groupId"),
    assigneeIds: strs(formData, "assigneeIds"),
    dependsOnIds: strs(formData, "dependsOnIds"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await createTask(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error], values };
  refresh();
  return { success: "Tâche créée." };
}

export async function updateTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const values = { title: str(formData, "title"), durationDays: str(formData, "durationDays") };
  const parsed = updateTaskSchema.safeParse({ ...values, taskId: str(formData, "taskId") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await updateTask(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error], values };
  refresh();
  return { success: "Modifications enregistrées.", values };
}

export async function setTaskAssigneesAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const parsed = taskAssigneesSchema.safeParse({
    taskId: str(formData, "taskId"),
    assigneeIds: strs(formData, "assigneeIds"),
  });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await setTaskAssignees(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error] };
  refresh();
  return { success: "Assignations enregistrées." };
}

export async function setTaskDependenciesAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const parsed = taskDependenciesSchema.safeParse({
    taskId: str(formData, "taskId"),
    dependsOnIds: strs(formData, "dependsOnIds"),
  });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await setTaskDependencies(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error] };
  refresh();
  return { success: "Dépendances enregistrées." };
}

export async function setTaskStatusAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const parsed = taskStatusSchema.safeParse({ taskId: str(formData, "taskId"), status: str(formData, "status") });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await setTaskStatus(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error] };
  refresh();
  return { success: "Statut mis à jour." };
}

export async function deleteTaskAction(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await requireVerifiedUser();
  const parsed = taskIdSchema.safeParse({ taskId: str(formData, "taskId") });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await deleteTask(user, parsed.data);
  if (!result.ok) return { error: TASK_ERROR_MESSAGES[result.error] };
  redirect(`/groupes/${result.groupId}/taches`);
}
