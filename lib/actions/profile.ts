"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { SESSION_EXPIRED_SIGN_IN } from "@/lib/routes";
import { changePassword, updateProfile } from "@/lib/services/user";
import { fieldErrors } from "@/lib/validation/auth";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/profile";
import type { FormState } from "./auth";

// Zod puis service. L'utilisateur vient toujours de la session.

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireVerifiedUser();
  const values = { firstName: str(formData, "firstName"), lastName: str(formData, "lastName") };
  // Un champ `username` dans la requête est transmis tel quel : le schéma strict le refuse.
  const input = formData.has("username") ? { ...values, username: str(formData, "username") } : values;

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.code === "unrecognized_keys")) {
      return { error: "Le nom d'utilisateur ne peut pas être modifié.", values };
    }
    return { errors: fieldErrors(parsed.error), values };
  }
  const result = await updateProfile(user.id, parsed.data);
  if (!result.ok) return { errors: result.errors, error: result.errors.form, values };
  return { message: "Profil mis à jour.", values };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireVerifiedUser();
  const input = {
    currentPassword: str(formData, "currentPassword"),
    newPassword: str(formData, "newPassword"),
  };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const result = await changePassword(user.id, parsed.data);
  if (!result.ok) return { errors: result.errors };

  // Toutes les sessions, dont celle-ci, sont désormais périmées : on rouvre une
  // session avec le nouveau mot de passe (nouveau JWT, nouvel authTime).
  try {
    await signIn("credentials", {
      email: user.email,
      password: parsed.data.newPassword,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) redirect(SESSION_EXPIRED_SIGN_IN);
    throw error;
  }
  return { message: "Mot de passe modifié. Vos autres sessions ont été déconnectées." };
}
