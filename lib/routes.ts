// Routes de l'application et règles de redirection du proxy.
// Ces règles sont un confort de navigation, pas une protection : les droits
// sont vérifiés par les guards (lib/auth/guards.ts) et les services.

/** Destination après connexion d'un utilisateur validé (l'accueil arrive à l'étape 4). */
export const HOME_PATH = "/";
export const SIGN_IN_PATH = "/connexion";
export const VERIFY_EMAIL_PATH = "/verifier-email";

/** Pages réservées aux visiteurs non connectés. */
const GUEST_ONLY = ["/connexion", "/inscription"];

/** Pages accessibles sans session. */
const PUBLIC_EXACT = ["/", "/connexion", "/inscription", "/mot-de-passe-oublie"];
const PUBLIC_PREFIXES = ["/reinitialiser/", "/verifier-email/"];

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

/** Chemin de redirection, ou null pour laisser passer. */
export function proxyRedirect(pathname: string, search: string, isLoggedIn: boolean): string | null {
  if (isLoggedIn && GUEST_ONLY.includes(pathname)) return HOME_PATH;
  if (!isLoggedIn && !isPublicPath(pathname)) {
    return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(pathname + search)}`;
  }
  return null;
}

/** N'accepte qu'un chemin interne (« /x »), jamais « //hote » ni une URL absolue. */
export function safeCallbackPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
