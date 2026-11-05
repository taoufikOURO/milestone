/**
 * Fuseau qui définit « aujourd'hui » pour la planification (décision 8). Le
 * service le convertit en numéro de jour ; lib/planning reçoit ce jour en
 * paramètre et ne lit jamais l'horloge.
 */
export const PLANNING_TIMEZONE = resolveTimeZone(process.env.PLANNING_TIMEZONE, "Africa/Lome");

/** Fuseau IANA de la variable d'environnement, ou `fallback` si elle est vide. */
export function resolveTimeZone(value: string | undefined, fallback: string): string {
  const zone = value?.trim() || fallback;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: zone });
  } catch {
    throw new Error("PLANNING_TIMEZONE n'est pas un fuseau IANA valide (ex. Africa/Lome).");
  }
  return zone;
}

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
