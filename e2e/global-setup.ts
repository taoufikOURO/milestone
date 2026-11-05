import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { resetDatabase, withDb } from "./support/db";
import { OUTBOX_FILE } from "./support/env";

/** Base de test à jour et vide, boîte d'envoi vide. */
export default async function globalSetup() {
  const migrate = spawnSync("node", ["scripts/migrate-test-db.mjs"], {
    stdio: "inherit",
    shell: true,
    cwd: path.resolve(__dirname, ".."),
  });
  if (migrate.status !== 0) throw new Error("Migration de la base de test impossible.");

  await withDb(resetDatabase);

  mkdirSync(path.dirname(OUTBOX_FILE), { recursive: true });
  rmSync(OUTBOX_FILE, { force: true });
}
