import { defineConfig } from "prisma/config";

// Prisma 7 ne charge plus .env automatiquement.
try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env (production) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node prisma/seed.ts" },
  datasource: {
    // DIRECT_URL (connexion directe) pour les migrations en production,
    // DATABASE_URL en local.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
