// Applique les migrations sur la base de test (TEST_DATABASE_URL).
// Les valeurs de .env ne sont jamais affichées.
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile();
} catch {
  // Pas de .env : variables de l'environnement.
}

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL est manquante dans .env.");
  process.exit(1);
}
if (url === process.env.DATABASE_URL) {
  console.error("TEST_DATABASE_URL doit être différente de DATABASE_URL.");
  process.exit(1);
}
if (!new URL(url).pathname.replace(/^\//, "").endsWith("_test")) {
  console.error("La base de TEST_DATABASE_URL doit se terminer par « _test ».");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url, DIRECT_URL: "" },
});
process.exit(result.status ?? 1);
