/**
 * URL publique de l'application, utilisée pour les liens envoyés par email.
 * Elle vient de APP_URL et jamais de l'en-tête Host de la requête, qui peut
 * être falsifié (empoisonnement des liens de réinitialisation).
 */
export function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL est manquante.");
  }
  return "http://localhost:3000";
}
