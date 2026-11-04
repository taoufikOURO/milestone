"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/auth/guards";
import {
  cancelInvitation,
  INVITATION_ERROR_MESSAGES,
  inviteToGroup,
  respondToInvitation,
} from "@/lib/services/invitation";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { cancelInvitationSchema, inviteSchema, respondInvitationSchema } from "@/lib/validation/group";

// Zod puis service ; le service vérifie que l'utilisateur est le chef (inviter)
// ou l'invité lui-même (répondre).

export type InvitationFormState = {
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

export async function inviteAction(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const user = await requireVerifiedUser();
  const username = str(formData, "username").replace(/^@/, "");
  const parsed = inviteSchema.safeParse({ groupId: str(formData, "groupId"), username });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: { username } };
  const result = await inviteToGroup(user, parsed.data);
  if (!result.ok) return { error: INVITATION_ERROR_MESSAGES[result.error], values: { username } };
  refresh();
  return { success: `Invitation envoyée à @${parsed.data.username}.` };
}

export async function respondInvitationAction(
  _prev: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const user = await requireVerifiedUser();
  const parsed = respondInvitationSchema.safeParse({
    invitationId: str(formData, "invitationId"),
    decision: str(formData, "decision"),
  });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await respondToInvitation(user, parsed.data);
  if (!result.ok) {
    refresh();
    return { error: INVITATION_ERROR_MESSAGES[result.error] };
  }
  if (result.joined) redirect(`/groupes/${result.groupId}`);
  refresh();
  return { success: "Invitation refusée." };
}

export async function cancelInvitationAction(
  _prev: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const user = await requireVerifiedUser();
  const parsed = cancelInvitationSchema.safeParse({ invitationId: str(formData, "invitationId") });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await cancelInvitation(user, parsed.data);
  if (!result.ok) {
    refresh();
    return {
      error:
        result.error === "not_leader"
          ? "Seul le chef du groupe peut annuler une invitation."
          : INVITATION_ERROR_MESSAGES[result.error],
    };
  }
  refresh();
  return { success: "Invitation annulée." };
}
