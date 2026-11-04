import { db } from "@/lib/db";
import { Prisma, type EmailTokenType } from "@/generated/prisma/client";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { checkEmailRateLimit, EMAIL_WINDOW_MS } from "@/lib/auth/rate-limit";
import { consumeToken, issueToken, type TokenState } from "@/lib/auth/tokens";
import { getAppUrl } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import {
  EmailDeliveryError,
  type EmailFailureReason,
  type EmailMessage,
  type EmailTransportKind,
} from "@/lib/email/types";
import {
  accountExistsMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from "@/lib/email/templates";
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  tokenSchema,
  type FieldErrors,
} from "@/lib/validation/auth";

export const USERNAME_TAKEN = "Ce nom d'utilisateur est déjà pris.";

type SendOutcome =
  | { ok: true; transport: EmailTransportKind }
  | { ok: false; reason: EmailFailureReason };

/** Envoi sans faire échouer l'action appelante : l'utilisateur peut renvoyer le mail. */
async function trySend(message: EmailMessage): Promise<SendOutcome> {
  try {
    const { transport } = await sendEmail(message);
    return { ok: true, transport };
  } catch (error) {
    console.error("Échec de l'envoi d'email :", error instanceof Error ? error.message : error);
    return { ok: false, reason: error instanceof EmailDeliveryError ? error.reason : "rejected" };
  }
}

async function rateLimitFor(userId: string, type: EmailTokenType, now: Date) {
  const recent = await db.emailToken.findMany({
    where: { userId, type, createdAt: { gt: new Date(now.getTime() - EMAIL_WINDOW_MS) } },
    select: { createdAt: true },
  });
  return checkEmailRateLimit(
    recent.map((t) => t.createdAt),
    now,
  );
}

async function sendVerificationEmail(user: { id: string; email: string }, now: Date) {
  const token = await issueToken(db, user.id, "verify_email", now);
  return trySend(verifyEmailMessage(user.email, `${getAppUrl()}/verifier-email/${token}`));
}

/**
 * Seul point d'écriture d'un nouveau mot de passe (réinitialisation, et profil
 * à l'étape 11) : `password_changed_at` est toujours mis à jour avec le hash,
 * ce qui invalide toutes les sessions ouvertes avant `now`.
 */
export async function setPassword(
  tx: Pick<Prisma.TransactionClient, "user">,
  userId: string,
  passwordHash: string,
  now: Date,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: now },
  });
}

// ─── Inscription ─────────────────────────────────────────────────────────────

export type RegisterResult = { ok: true } | { ok: false; errors: FieldErrors };

/**
 * Crée le compte et envoie le lien de validation. Si l'email est déjà utilisé,
 * la réponse est la même qu'en cas de succès (pas d'énumération des comptes) et
 * le titulaire de l'adresse reçoit un email l'informant qu'il a déjà un compte.
 * Le nom d'utilisateur, lui, est public : un doublon est signalé clairement.
 */
export async function registerUser(input: unknown, now: Date = new Date()): Promise<RegisterResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const data = parsed.data;

  const passwordHash = await hashPassword(data.password);
  try {
    const user = await db.user.create({
      data: {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
      },
      select: { id: true, email: true },
    });
    await sendVerificationEmail(user, now);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
    // P2002 : contrainte unique violée. On relit la base pour savoir laquelle,
    // plutôt que de dépendre du format de `meta` (variable selon l'adaptateur).
    const [byUsername, byEmail] = await Promise.all([
      db.user.findUnique({ where: { username: data.username }, select: { id: true } }),
      db.user.findUnique({ where: { email: data.email }, select: { id: true } }),
    ]);
    if (byUsername) return { ok: false, errors: { username: USERNAME_TAKEN } };
    if (byEmail) {
      await trySend(accountExistsMessage(data.email, `${getAppUrl()}/connexion`));
      return { ok: true };
    }
    throw error;
  }
}

// ─── Connexion ───────────────────────────────────────────────────────────────

export type AuthenticatedUser = { id: string; email: string; name: string };

/** Utilisé par le provider Credentials. Un utilisateur non validé peut se connecter. */
export async function authenticate(input: unknown): Promise<AuthenticatedUser | null> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, username: true, passwordHash: true },
  });
  if (!user) return verifyAgainstDummy(parsed.data.password).then(() => null);

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  return ok ? { id: user.id, email: user.email, name: user.username } : null;
}

// ─── Validation de l'email ───────────────────────────────────────────────────

export type TokenResult = { ok: true } | { ok: false; reason: Exclude<TokenState, "valid"> };

export async function verifyEmail(token: unknown, now: Date = new Date()): Promise<TokenResult> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  return db.$transaction(async (tx) => {
    const result = await consumeToken(tx, parsed.data, "verify_email", now);
    if (!result.ok) return result;
    await tx.user.updateMany({
      where: { id: result.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    return { ok: true as const };
  });
}

export type ResendResult =
  | { ok: true; transport: EmailTransportKind }
  | { ok: false; error: "already_verified" }
  | { ok: false; error: "send_failed"; reason: EmailFailureReason }
  | { ok: false; error: "rate_limited"; retryAfterSeconds: number };

/** `userId` vient de la session, jamais du formulaire. */
export async function resendVerificationEmail(
  userId: string,
  now: Date = new Date(),
): Promise<ResendResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (user.emailVerifiedAt) return { ok: false, error: "already_verified" };

  const limit = await rateLimitFor(user.id, "verify_email", now);
  if (!limit.allowed) {
    return { ok: false, error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };
  }
  const sent = await sendVerificationEmail(user, now);
  return sent.ok
    ? { ok: true, transport: sent.transport }
    : { ok: false, error: "send_failed", reason: sent.reason };
}

// ─── Réinitialisation du mot de passe ────────────────────────────────────────

export type ForgotResult = { ok: true } | { ok: false; errors: FieldErrors };

/**
 * Réponse identique que le compte existe ou non. La limite de fréquence est
 * appliquée en silence pour la même raison.
 */
export async function requestPasswordReset(input: unknown, now: Date = new Date()): Promise<ForgotResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });
  if (!user) return { ok: true };

  const limit = await rateLimitFor(user.id, "reset_password", now);
  if (!limit.allowed) return { ok: true };

  const token = await issueToken(db, user.id, "reset_password", now);
  await trySend(resetPasswordMessage(user.email, `${getAppUrl()}/reinitialiser/${token}`));
  return { ok: true };
}

export type ResetResult =
  | { ok: true }
  | { ok: false; errors: FieldErrors }
  | { ok: false; reason: Exclude<TokenState, "valid"> };

export async function resetPassword(input: unknown, now: Date = new Date()): Promise<ResetResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.token) return { ok: false, reason: "invalid" };
    return { ok: false, errors };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  return db.$transaction(async (tx) => {
    const result = await consumeToken(tx, parsed.data.token, "reset_password", now);
    if (!result.ok) return result;
    await setPassword(tx, result.userId, passwordHash, now);
    // Les autres liens de réinitialisation encore valides sont invalidés.
    await tx.emailToken.updateMany({
      where: { userId: result.userId, type: "reset_password", usedAt: null },
      data: { usedAt: now },
    });
    return { ok: true as const };
  });
}

/** Message affiché pour un token refusé. */
export function tokenErrorMessage(reason: Exclude<TokenState, "valid">): string {
  switch (reason) {
    case "expired":
      return "Ce lien a expiré. Demandez-en un nouveau.";
    case "used":
      return "Ce lien a déjà été utilisé. Demandez-en un nouveau si nécessaire.";
    default:
      return "Ce lien est invalide.";
  }
}
