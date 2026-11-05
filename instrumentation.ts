/**
 * Exécuté une fois au démarrage du serveur Next.js. En production
 * (ENVIRONMENT=production), une configuration SMTP incomplète arrête le
 * démarrage avec un message clair (noms des variables, jamais leurs valeurs).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnvironment, readSmtpConfig } = await import("@/lib/config");
  if (getEnvironment() === "production") readSmtpConfig();
}
