import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests d'intégration sur la base dédiée TEST_DATABASE_URL (milestone_test).
// Préparer la base avec : pnpm db:test:migrate
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.int.test.ts"],
    exclude: ["node_modules/**", ".next/**", "generated/**"],
    setupFiles: ["./tests/load-env.ts"],
    // Les suites partagent une seule base : pas d'exécution en parallèle.
    fileParallelism: false,
  },
});
