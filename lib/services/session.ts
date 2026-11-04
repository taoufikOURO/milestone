import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authConfig } from "@/auth.config";
import { isSessionCurrent } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Premier contrôle : relit password_changed_at. `null` fait supprimer le
 * cookie par Auth.js (route /api/auth/*, server actions) et rend `auth()` nul.
 * Le guard refait le contrôle de son côté.
 */
export async function checkSessionToken(token: JWT): Promise<JWT | null> {
  if (!token.sub) return token;
  const user = await db.user.findUnique({
    where: { id: token.sub },
    select: { passwordChangedAt: true },
  });
  if (!user) return null;
  return isSessionCurrent(token.authTime, user.passwordChangedAt) ? token : null;
}

type JwtCallback = NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>;

/** Callback jwt d'auth.ts. */
export const sessionJwtCallback: JwtCallback = async (params) => {
  const token = await authConfig.callbacks.jwt(params);
  // Connexion en cours : le mot de passe vient d'être vérifié, authTime est posé.
  if (params.user) return token;
  // Session existante : refusée si le mot de passe a changé depuis la connexion.
  return checkSessionToken(token);
};
