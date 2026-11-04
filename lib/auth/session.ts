// Règles pures de validité d'une session JWT (sans base, utilisables dans le proxy).
//
// On n'utilise pas `iat` : Auth.js ré-encode le JWT (et réécrit `iat`) à chaque
// lecture de session, donc une vieille session aurait toujours un `iat` récent.
// `authTime` est posé une seule fois, à la connexion, et conservé ensuite.

import type { JWT } from "next-auth/jwt";

export const SESSION_EXPIRED_MESSAGE =
  "Votre session a expiré. Veuillez vous reconnecter.";

export type SessionStatus = { ok: true } | { ok: false; message: string };

/**
 * Une session est valide si elle a été ouverte au même instant ou après le
 * dernier changement de mot de passe (comparaison en millisecondes, `>=`).
 */
export function sessionStatus(
  authTime: number | undefined,
  passwordChangedAt: Date | null,
): SessionStatus {
  if (!passwordChangedAt) return { ok: true };
  // JWT émis avant ce mécanisme, alors que le mot de passe a changé depuis.
  if (typeof authTime !== "number") return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  return authTime >= passwordChangedAt.getTime()
    ? { ok: true }
    : { ok: false, message: SESSION_EXPIRED_MESSAGE };
}

export function isSessionCurrent(authTime: number | undefined, passwordChangedAt: Date | null) {
  return sessionStatus(authTime, passwordChangedAt).ok;
}

/** Contenu du JWT à la connexion : identifiant et instant de connexion. */
export function applySignIn(token: JWT, userId: string, now: number = Date.now()): JWT {
  return { ...token, sub: userId, authTime: now };
}

/** Cookie de session Auth.js (éventuellement découpé en .0, .1…, préfixé __Secure- en HTTPS). */
export function hasSessionCookie(names: string[]): boolean {
  return names.some((n) => /^(__Secure-)?authjs\.session-token(\.\d+)?$/.test(n));
}
