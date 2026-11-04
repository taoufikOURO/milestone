import { z } from "zod";

// Tâches (§4.5, §4.7). Les droits sont vérifiés par le service, pas ici.

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatusName = (typeof TASK_STATUSES)[number];

/** Borne technique (colonne INTEGER), bien au-delà de la durée d'un projet. */
export const MAX_DURATION_DAYS = 1000;

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Le titre est obligatoire.")
  .max(200, "Le titre ne doit pas dépasser 200 caractères.");

/** Jours calendaires, cours inclus (§4.5) : entier strictement positif, sans heure. */
export const durationDaysSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "La durée doit être un nombre entier de jours.")
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(1, "La durée doit être d'au moins 1 jour.")
      .max(MAX_DURATION_DAYS, `La durée ne doit pas dépasser ${MAX_DURATION_DAYS} jours.`),
  );

/** Liste d'identifiants (cases à cocher), sans doublon. */
const idListSchema = z
  .array(z.uuid())
  .max(200)
  .transform((ids) => [...new Set(ids)]);

export const createTaskSchema = z.object({
  groupId: z.uuid(),
  title: taskTitleSchema,
  durationDays: durationDaysSchema,
  assigneeIds: idListSchema,
  dependsOnIds: idListSchema,
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  title: taskTitleSchema,
  durationDays: durationDaysSchema,
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskAssigneesSchema = z.object({ taskId: z.uuid(), assigneeIds: idListSchema });
export type TaskAssigneesInput = z.infer<typeof taskAssigneesSchema>;

export const taskDependenciesSchema = z.object({ taskId: z.uuid(), dependsOnIds: idListSchema });
export type TaskDependenciesInput = z.infer<typeof taskDependenciesSchema>;

export const taskStatusSchema = z.object({ taskId: z.uuid(), status: z.enum(TASK_STATUSES) });
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;

export const taskIdSchema = z.object({ taskId: z.uuid() });
