"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/auth/guards";
import {
  createGroup,
  deleteGroup,
  GROUP_ERROR_MESSAGES,
  leaveGroup,
  transferLeadership,
  updateGroup,
} from "@/lib/services/group";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import {
  createGroupSchema,
  groupIdSchema,
  leaveGroupSchema,
  transferLeadershipSchema,
  updateGroupSchema,
} from "@/lib/validation/group";

// Les actions valident l'entrée (Zod) puis délèguent au service, qui vérifie
// les droits sur le groupe. L'utilisateur vient toujours de la session.

export type GroupFormState = {
  errors?: FieldErrors;
  error?: string;
  success?: string;
  values?: Record<string, string>;
};

const HOME = "/accueil";
const INVALID_REQUEST = "Requête invalide. Rechargez la page et réessayez.";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

const groupPath = (groupId: string) => `/groupes/${groupId}`;

export async function createGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireVerifiedUser();
  const values = { name: str(formData, "name"), startDate: str(formData, "startDate"), endDate: str(formData, "endDate") };
  const parsed = createGroupSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await createGroup(user, parsed.data);
  if (!result.ok) return { error: GROUP_ERROR_MESSAGES[result.error], values };
  redirect(groupPath(result.groupId));
}

export async function updateGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireVerifiedUser();
  const values = {
    name: str(formData, "name"),
    startDate: str(formData, "startDate"),
    endDate: str(formData, "endDate"),
    marginPercent: str(formData, "marginPercent"),
  };
  const parsed = updateGroupSchema.safeParse({ ...values, groupId: str(formData, "groupId") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const result = await updateGroup(user, parsed.data);
  if (!result.ok) return { error: GROUP_ERROR_MESSAGES[result.error], values };
  refresh();
  return { success: "Modifications enregistrées.", values };
}

export async function deleteGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireVerifiedUser();
  const parsed = groupIdSchema.safeParse({ groupId: str(formData, "groupId") });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await deleteGroup(user, parsed.data);
  if (!result.ok) return { error: GROUP_ERROR_MESSAGES[result.error] };
  redirect(HOME);
}

export async function leaveGroupAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireVerifiedUser();
  const parsed = leaveGroupSchema.safeParse({
    groupId: str(formData, "groupId"),
    successorId: str(formData, "successorId") || undefined,
  });
  if (!parsed.success) return { error: INVALID_REQUEST };
  const result = await leaveGroup(user, parsed.data);
  if (!result.ok) return { error: GROUP_ERROR_MESSAGES[result.error] };
  redirect(HOME);
}

export async function transferLeadershipAction(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireVerifiedUser();
  const parsed = transferLeadershipSchema.safeParse({
    groupId: str(formData, "groupId"),
    successorId: str(formData, "successorId"),
  });
  if (!parsed.success) return { error: GROUP_ERROR_MESSAGES.invalid_successor };
  const result = await transferLeadership(user, parsed.data);
  if (!result.ok) return { error: GROUP_ERROR_MESSAGES[result.error] };
  redirect(`${groupPath(parsed.data.groupId)}/membres`);
}
