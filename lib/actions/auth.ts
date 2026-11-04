"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import type { EmailFailureReason } from "@/lib/email";
import { HOME_PATH, safeCallbackPath, SIGN_IN_PATH, VERIFY_EMAIL_PATH } from "@/lib/routes";
import {
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  tokenErrorMessage,
  verifyEmail,
} from "@/lib/services/auth";
import { signInSchema, type FieldErrors } from "@/lib/validation/auth";

// Les server actions valident l'entrée et délèguent aux services.

export type FormState = {
  errors?: FieldErrors;
  error?: string;
  message?: string;
  /** Valeurs à réafficher (jamais les mots de passe). */
  values?: Record<string, string>;
};

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = {
    username: str(formData, "username"),
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    email: str(formData, "email"),
    password: str(formData, "password"),
  };
  const result = await registerUser(input);
  if (!result.ok) {
    const { username, firstName, lastName, email } = input;
    return { errors: result.errors, values: { username, firstName, lastName, email } };
  }
  redirect(`${SIGN_IN_PATH}?inscription=ok`);
}

const INVALID_CREDENTIALS = "Email ou mot de passe incorrect.";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const values = { email };
  const parsed = signInSchema.safeParse({ email, password: str(formData, "password") });
  if (!parsed.success) return { error: INVALID_CREDENTIALS, values };

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: INVALID_CREDENTIALS, values };
    throw error;
  }

  // La session vient d'être créée : l'état de validation est lu en base.
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { emailVerifiedAt: true },
  });
  if (!user?.emailVerifiedAt) redirect(VERIFY_EMAIL_PATH);
  redirect(safeCallbackPath(str(formData, "callbackUrl")) ?? HOME_PATH);
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}

export async function resendVerificationAction(): Promise<FormState> {
  // L'utilisateur vient de la session, jamais du formulaire.
  const user = await requireUser();
  const result = await resendVerificationEmail(user.id);
  if (result.ok) {
    if (result.transport === "console") return { message: CONSOLE_TRANSPORT_MESSAGE };
    return { message: `Un nouveau lien a été envoyé à ${user.email}.` };
  }
  if (result.error === "already_verified") redirect(HOME_PATH);
  if (result.error === "rate_limited") {
    return { error: `Patientez ${formatDelay(result.retryAfterSeconds)} avant de renvoyer le mail.` };
  }
  return { error: EMAIL_FAILURE_MESSAGES[result.reason] };
}

const CONSOLE_TRANSPORT_MESSAGE = "Mode développement : le lien est affiché dans le terminal.";

/** Messages affichés : la cause est explicite, sans clé, statut ni réponse brute du fournisseur. */
const EMAIL_FAILURE_MESSAGES: Record<EmailFailureReason, string> = {
  config: "L'envoi d'email n'est pas configuré sur le serveur. Contactez l'administrateur.",
  unauthorized:
    "Le service d'email a refusé la clé API du serveur. Contactez l'administrateur.",
  sender:
    "L'adresse d'expédition n'est pas validée auprès du service d'email. Contactez l'administrateur.",
  quota: "Le quota d'envoi d'emails est atteint. Réessayez plus tard.",
  unavailable: "Le service d'email est injoignable. Réessayez dans quelques instants.",
  rejected: "Le service d'email a refusé l'envoi. Réessayez dans quelques instants.",
};

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

export async function verifyEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await verifyEmail(str(formData, "token"));
  if (!result.ok) return { error: tokenErrorMessage(result.reason) };
  return { message: "Votre adresse email est validée." };
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const result = await requestPasswordReset({ email });
  if (!result.ok) return { errors: result.errors, values: { email } };
  return {
    message:
      "Si un compte correspond à cette adresse, un email contenant un lien de réinitialisation vient d'être envoyé.",
  };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await resetPassword({
    token: str(formData, "token"),
    password: str(formData, "password"),
    confirm: str(formData, "confirm"),
  });
  if (result.ok) redirect(`${SIGN_IN_PATH}?reinitialisation=ok`);
  if ("reason" in result) return { error: tokenErrorMessage(result.reason) };
  return { errors: result.errors };
}
