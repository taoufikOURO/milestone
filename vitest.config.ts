import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests unitaires : aucune base de données. Les tests d'intégration
// (*.int.test.ts) passent par vitest.integration.config.ts.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    // Jamais de vrai email pendant les tests : transport console imposé
    // (process.loadEnvFile n'écrase pas une variable déjà définie).
    env: { ENVIRONMENT: "test" },
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "generated/**", "**/*.int.test.ts"],
  },
});
