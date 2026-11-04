import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setPassword } from "@/lib/services/auth";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/profile";

export const WRONG_CURRENT_PASSWORD = "Le mot de passe actuel est incorrect.";
export const USERNAME_READONLY = "Le nom d'utilisateur ne peut pas être modifié.";

export type ProfileResult = { ok: true } | { ok: false; errors: FieldErrors };

/** Mise à jour du prénom et du nom. `userId` vient de la session, jamais du formulaire. */
export async function updateProfile(userId: string, input: unknown): Promise<ProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    // Clé inconnue (dont `username`) : refus de toute la requête, rien n'est écrit.
    if (parsed.error.issues.some((i) => i.code === "unrecognized_keys")) {
      return { ok: false, errors: { form: USERNAME_READONLY } };
    }
    return { ok: false, errors: fieldErrors(parsed.error) };
  }
  await db.user.update({ where: { id: userId }, data: parsed.data });
  return { ok: true };
}

/**
 * Change le mot de passe après vérification de l'ancien (argon2id). Passe par
 * `setPassword` : `password_changed_at` est mis à jour, ce qui invalide toutes
 * les sessions ouvertes avant `now`.
 */
export async function changePassword(
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<ProfileResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new Error("Utilisateur introuvable.");
  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, errors: { currentPassword: WRONG_CURRENT_PASSWORD } };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.$transaction((tx) => setPassword(tx, userId, passwordHash, now));
  return { ok: true };
}
