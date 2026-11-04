import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export type CurrentUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerifiedAt: Date | null;
};

const SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  email: true,
  emailVerifiedAt: true,
} as const;

/**
 * Utilisateur de la session, relu en base. `null` si pas de session ou si le
 * compte n'existe plus (JWT encore valide d'un compte supprimé).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({ where: { id }, select: SELECT });
}

/** Connecté, email validé ou non. Sinon redirection vers la connexion. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

/**
 * Connecté et email validé (§4.1, §8). `email_verified_at` est relu en base à
 * chaque appel : le JWT n'en contient aucune copie. À appeler dans chaque page,
 * server action et service qui effectue une action.
 */
export async function requireVerifiedUser(): Promise<CurrentUser & { emailVerifiedAt: Date }> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) redirect("/verifier-email");
  return { ...user, emailVerifiedAt: user.emailVerifiedAt };
}
