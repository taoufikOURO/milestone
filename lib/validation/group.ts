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

/**
 * Marge de sécurité du groupe (§4.6, décision 19) : la seule marge de
 * l'application, il n'y en a pas par tâche. 0 % = pas de marge.
 */
export const MIN_MARGIN_PERCENT = 0;
export const MAX_MARGIN_PERCENT = 100;

const MARGIN_RANGE_MESSAGE = `La marge doit être comprise entre ${MIN_MARGIN_PERCENT} et ${MAX_MARGIN_PERCENT} %.`;

// Chaîne de chiffres uniquement : z.coerce.number accepterait "" ou " " (→ 0),
// "1e1" (→ 10) ou "0x10" (→ 16), et un champ vidé supprimerait la marge.
export const marginPercentSchema = z
  .string()
  .trim()
  .regex(/^-?\d+$/, "La marge doit être un nombre entier.")
  .transform(Number)
  .pipe(
    z
      .number()
      .int("La marge doit être un nombre entier.")
      .min(MIN_MARGIN_PERCENT, MARGIN_RANGE_MESSAGE)
      .max(MAX_MARGIN_PERCENT, MARGIN_RANGE_MESSAGE),
  );

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
