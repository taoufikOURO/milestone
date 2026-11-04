import { z } from "zod";
import { normalizePromoCode } from "@/lib/promo-code";

export const promoNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom de la promo doit contenir au moins 2 caractères.")
  .max(100, "Le nom de la promo ne doit pas dépasser 100 caractères.");

export const createPromoSchema = z.object({ name: promoNameSchema });

// Le format n'est pas vérifié ici : tout code inconnu reçoit le même message
// générique côté service.
export const joinPromoSchema = z.object({
  code: z.string().max(64).transform(normalizePromoCode),
});

const userIdSchema = z.uuid();

export const transferDelegationSchema = z.object({
  promoId: z.uuid(),
  successorId: userIdSchema,
});

export const deletePromoSchema = z.object({ promoId: z.uuid() });

export const leavePromoSchema = z.object({
  successorId: userIdSchema.optional(),
  /** groupId → userId du successeur. */
  groupSuccessors: z.record(z.uuid(), userIdSchema).default({}),
});

export type LeavePromoInput = z.infer<typeof leavePromoSchema>;
