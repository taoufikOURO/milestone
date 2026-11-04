import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const TABLES = [
  "meetings",
  "task_dependencies",
  "task_assignments",
  "tasks",
  "group_invitations",
  "group_members",
  "groups",
  "promo_members",
  "promos",
  "email_tokens",
  "users",
];

/**
 * Vérifie que l'URL pointe vers une base de test (nom finissant par « _test »)
 * distincte de DATABASE_URL, car les tests vident toutes les tables.
 */
export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL est manquante dans .env.");
  }
  // Après tests/use-test-db.ts, DATABASE_URL vaut volontairement TEST_DATABASE_URL
  // (vérification déjà faite à ce moment-là).
  if (process.env.MILESTONE_DB_IS_TEST !== "1" && url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL doit être différente de DATABASE_URL.");
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error("La base de TEST_DATABASE_URL doit se terminer par « _test ».");
  }
  return url;
}

export function createTestClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: getTestDatabaseUrl() }),
  });
}

export async function resetDatabase(db: PrismaClient): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

let counter = 0;

export async function createUser(db: PrismaClient) {
  counter += 1;
  const suffix = `${Date.now()}${counter}`;
  return db.user.create({
    data: {
      username: `user${suffix}`,
      firstName: "Test",
      lastName: "Utilisateur",
      email: `user${suffix}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
}
