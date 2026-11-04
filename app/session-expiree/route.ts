import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { hasSessionCookie } from "@/lib/auth/session";
import { HOME_PATH, SESSION_EXPIRED_SIGN_IN, SIGN_IN_PATH } from "@/lib/routes";

/**
 * Supprime le cookie d'une session refusée (mot de passe changé depuis la
 * connexion, compte supprimé). Une session encore valide n'est jamais
 * déconnectée ici : un lien malveillant vers cette route est donc sans effet.
 */
export async function GET() {
  const session = await auth(); // nul si le callback jwt a refusé la session
  if (session?.user?.id) redirect(HOME_PATH);

  const names = (await cookies()).getAll().map((c) => c.name);
  if (!hasSessionCookie(names)) redirect(SIGN_IN_PATH);

  await signOut({ redirectTo: SESSION_EXPIRED_SIGN_IN });
}
