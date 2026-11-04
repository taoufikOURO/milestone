import { z } from "zod";
import { usernameSchema } from "@/lib/validation/auth";

// Groupes et invitations (§4.3, §4.4). Les dates de groupe sont des colonnes
// DATE : on les manipule à minuit UTC.

export const groupNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom du groupe doit contenir au moins 2 caractères.")
  .max(100, "Le nom du groupe ne doit pas dépasser 100 caractères.");

/** « AAAA-MM-JJ » (champ <input type="date">) → Date à minuit UTC. */
const dateSchema = (label: string) =>
  z.iso
    .date({ error: `${label} est invalide.` })
    .transform((value) => new Date(`${value}T00:00:00.000Z`));

const groupDatesShape = {
  name: groupNameSchema,
  startDate: dateSchema("La date de début"),
  endDate: dateSchema("La date de fin"),
};

const endAfterStart = {
  check: (v: { startDate: Date; endDate: Date }) => v.endDate.getTime() >= v.startDate.getTime(),
  params: { message: "La date de fin doit être égale ou postérieure à la date de début.", path: ["endDate"] },
};

export const createGroupSchema = z.object(groupDatesShape).refine(endAfterStart.check, endAfterStart.params);
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const marginPercentSchema = z.coerce
  .number({ error: "La marge doit être un nombre entier." })
  .int("La marge doit être un nombre entier.")
  .min(0, "La marge doit être comprise entre 0 et 100 %.")
  .max(100, "La marge doit être comprise entre 0 et 100 %.");

export const updateGroupSchema = z
  .object({ groupId: z.uuid(), ...groupDatesShape, marginPercent: marginPercentSchema })
  .refine(endAfterStart.check, endAfterStart.params);
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const groupIdSchema = z.object({ groupId: z.uuid() });

export const leaveGroupSchema = z.object({ groupId: z.uuid(), successorId: z.uuid().optional() });
export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;

export const transferLeadershipSchema = z.object({ groupId: z.uuid(), successorId: z.uuid() });

export const inviteSchema = z.object({ groupId: z.uuid(), username: usernameSchema });
export type InviteInput = z.infer<typeof inviteSchema>;

export const respondInvitationSchema = z.object({
  invitationId: z.uuid(),
  decision: z.enum(["accept", "decline"]),
});
export type RespondInvitationInput = z.infer<typeof respondInvitationSchema>;

export const cancelInvitationSchema = z.object({ invitationId: z.uuid() });
