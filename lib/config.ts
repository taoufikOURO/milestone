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

/**
 * Environnement d'exécution : « production » seulement si ENVIRONMENT vaut
 * exactement cette valeur. Absente ou autre valeur : développement.
 */
export function getEnvironment(value: string | undefined = process.env.ENVIRONMENT): "production" | "development" {
  return value === "production" ? "production" : "development";
}

/** Configuration SMTP (Gmail en production). */
export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  /** Expéditeur tel que saisi dans MAIL_FROM, ex. « Milestone <adresse@gmail.com> ». */
  from: string;
};

const DEFAULT_SMTP_PORT = 587;

/** Adresse de « Milestone <adresse@exemple.fr> » ou de « adresse@exemple.fr ». */
export function parseMailAddress(value: string): string | null {
  const match = /^\s*(?:.*?\s*)?<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/.exec(value);
  if (match) return match[1];
  const bare = value.trim();
  return /^[^<>\s]+@[^<>\s]+$/.test(bare) ? bare : null;
}

/**
 * Lit et valide les variables SMTP. Les messages d'erreur citent les noms des
 * variables, jamais leurs valeurs (en particulier SMTP_PASSWORD).
 */
export function readSmtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD;
  const from = env.MAIL_FROM?.trim();

  const missing = [
    ["SMTP_HOST", host],
    ["SMTP_USER", user],
    ["SMTP_PASSWORD", password],
    ["MAIL_FROM", from],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0 || !host || !user || !password || !from) {
    throw new Error(`Configuration email incomplète : variable(s) manquante(s) ${missing.join(", ")}.`);
  }

  const rawPort = env.SMTP_PORT?.trim();
  const port = rawPort ? Number(rawPort) : DEFAULT_SMTP_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT doit être un numéro de port (587 pour Gmail en STARTTLS).");
  }

  if (!parseMailAddress(user)) {
    throw new Error("SMTP_USER doit être une adresse email complète.");
  }
  const fromAddress = parseMailAddress(from);
  if (!fromAddress) {
    throw new Error("MAIL_FROM est invalide (ex. « Milestone <adresse@gmail.com> »).");
  }
  if (fromAddress.toLowerCase() !== user.toLowerCase()) {
    throw new Error("MAIL_FROM doit utiliser la même adresse que SMTP_USER.");
  }

  return { host, port, user, password, from };
}
