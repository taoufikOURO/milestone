import path from "node:path";

// Environnement des tests end-to-end. Les valeurs de .env ne sont jamais affichées.

try {
  process.loadEnvFile();
} catch {
  // Pas de .env : variables de l'environnement (CI).
}

export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
/** Boîte d'envoi du transport console, lue par les tests (jamais de vrais emails). */
export const OUTBOX_FILE = path.resolve(__dirname, "..", "..", ".e2e", "outbox.jsonl");

/**
 * Base dédiée (nom terminé par « _test », différente de DATABASE_URL) : les
 * tests e2e la vident au démarrage.
 */
export function e2eDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL est manquante dans .env.");
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL doit être différente de DATABASE_URL.");
  }
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error("La base de TEST_DATABASE_URL doit se terminer par « _test ».");
  }
  return url;
}
