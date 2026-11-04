import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasSessionCookie, isSessionCurrent } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { SESSION_EXPIRED_PATH, SIGN_IN_PATH, VERIFY_EMAIL_PATH } from "@/lib/routes";

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
  passwordChangedAt: true,
} as const;

type SessionLookup = { status: "ok"; user: CurrentUser } | { status: "none" } | { status: "expired" };

async function lookupSession(): Promise<SessionLookup> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    // auth() est nul aussi quand le callback jwt a refusé la session. Si le
    // cookie est encore là (un Server Component ne peut pas le supprimer), on
    // passe par /session-expiree, qui le supprime.
    const names = (await cookies()).getAll().map((c) => c.name);
    return hasSessionCookie(names) ? { status: "expired" } : { status: "none" };
  }

  const row = await db.user.findUnique({ where: { id }, select: SELECT });
  if (!row) return { status: "expired" };
  // Second contrôle, indépendant du callback jwt.
  if (!isSessionCurrent(session.authTime, row.passwordChangedAt)) return { status: "expired" };
  const { passwordChangedAt, ...user } = row;
  void passwordChangedAt;
  return { status: "ok", user };
}

/**
 * Utilisateur de la session, relu en base. `null` si pas de session, si le
 * compte n'existe plus ou si le mot de passe a changé depuis la connexion.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await lookupSession();
  return result.status === "ok" ? result.user : null;
}

/** Connecté, email validé ou non. Sinon redirection vers la connexion. */
export async function requireUser(): Promise<CurrentUser> {
  const result = await lookupSession();
  if (result.status === "expired") redirect(SESSION_EXPIRED_PATH);
  if (result.status === "none") redirect(SIGN_IN_PATH);
  return result.user;
}

/**
 * Connecté et email validé (§4.1, §8). `email_verified_at` et
 * `password_changed_at` sont relus en base à chaque appel. À appeler dans
 * chaque page, server action et service qui effectue une action.
 */
export async function requireVerifiedUser(): Promise<CurrentUser & { emailVerifiedAt: Date }> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) redirect(VERIFY_EMAIL_PATH);
  return { ...user, emailVerifiedAt: user.emailVerifiedAt };
}
