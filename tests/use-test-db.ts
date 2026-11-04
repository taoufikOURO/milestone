import { getTestDatabaseUrl } from "./test-db";

// Les services importent `db` (lib/db.ts), construit depuis DATABASE_URL.
// Pour les tests d'intégration, on le fait pointer vers la base de test, après
// avoir vérifié qu'elle se termine par « _test » et diffère de DATABASE_URL.
// Le marqueur évite de refaire la vérification (qui échouerait) quand le setup
// est rejoué dans le même processus pour un autre fichier de test.
if (process.env.MILESTONE_DB_IS_TEST !== "1") {
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.MILESTONE_DB_IS_TEST = "1";
}
