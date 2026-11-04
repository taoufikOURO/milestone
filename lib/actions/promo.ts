"use server";

import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/auth/guards";
import {
  createPromo,
  deletePromo,
  joinPromo,
  leavePromo,
  PROMO_ERROR_MESSAGES,
  transferDelegation,
  type PromoFailure,
} from "@/lib/services/promo";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  createPromoSchema,
  deletePromoSchema,
  joinPromoSchema,
  leavePromoSchema,
  transferDelegationSchema,
} from "@/lib/validation/promo";

// Les actions valident l'entrée (Zod) puis délèguent au service, qui vérifie
// les droits. L'utilisateur vient toujours de la session.

export type PromoFormState = {
  errors?: FieldErrors;
  error?: string;
  values?: Record<string, string>;
  /** Groupes dont le successeur manque. */
  groups?: { id: string; name: string }[];
};

const PROMO_PATH = "/promo";
const INVALID_REQUEST = "Requête invalide. Rechargez la page et réessayez.";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function failure(result: PromoFailure): PromoFormState {
  return { error: PROMO_ERROR_MESSAGES[result.error], groups: result.groups };
}

export async function createPromoAction(_prev: PromoFormState, formData: FormData): Promise<PromoFormState> {
  const user = await requireVerifiedUser();
  const name = str(formData, "name");
  const parsed = createPromoSchema.safeParse({ name });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { name } };
  const result = await createPromo(user, parsed.data);
  if (!result.ok) return { ...failure(result), values: { name } };
  redirect(`${PROMO_PATH}?creee=1`);
}

export async function joinPromoAction(_prev: PromoFormState, formData: FormData): Promise<PromoFormState> {
  const user = await requireVerifiedUser();
  const code = str(formData, "code");
  const parsed = joinPromoSchema.safeParse({ code });
  if (!parsed.success) return { error: PROMO_ERROR_MESSAGES.invalid_code, values: { code } };
  const result = await joinPromo(user, parsed.data);
  if (!result.ok) return { ...failure(result), values: { code } };
  redirect(PROMO_PATH);
}

const GROUP_SUCCESSOR_PREFIX = "groupSuccessor:";

export async function leavePromoAction(_prev: PromoFormState, formData: FormData): Promise<PromoFormState> {
  const user = await requireVerifiedUser();
  const groupSuccessors: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(GROUP_SUCCESSOR_PREFIX) && typeof value === "string" && value) {
      groupSuccessors[key.slice(GROUP_SUCCESSOR_PREFIX.length)] = value;
    }
  }
  const parsed = leavePromoSchema.safeParse({
    successorId: str(formData, "successorId") || undefined,
    groupSuccessors,
  });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await leavePromo(user, parsed.data);
  if (!result.ok) return failure(result);
  redirect(PROMO_PATH);
}

export async function transferDelegationAction(
  _prev: PromoFormState,
  formData: FormData,
): Promise<PromoFormState> {
  const user = await requireVerifiedUser();
  const parsed = transferDelegationSchema.safeParse({
    promoId: str(formData, "promoId"),
    successorId: str(formData, "successorId"),
  });
  if (!parsed.success) return { error: PROMO_ERROR_MESSAGES.invalid_successor };
  const result = await transferDelegation(user, parsed.data);
  if (!result.ok) return failure(result);
  redirect(PROMO_PATH);
}

export async function deletePromoAction(_prev: PromoFormState, formData: FormData): Promise<PromoFormState> {
  const user = await requireVerifiedUser();
  const parsed = deletePromoSchema.safeParse({ promoId: str(formData, "promoId") });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await deletePromo(user, parsed.data);
  if (!result.ok) return failure(result);
  redirect(PROMO_PATH);
}
