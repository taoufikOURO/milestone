import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, e2eDatabaseUrl, OUTBOX_FILE } from "./e2e/support/env";

// Tests end-to-end des critères d'acceptation (§11). Ils tournent sur la base
// milestone_test, avec un serveur `next dev` dédié (port 3100, dossier
// .next-e2e) et le transport d'email console doublé d'une boîte d'envoi fichier.
// Les scénarios partagent une base : exécution en série.

const databaseUrl = e2eDatabaseUrl();

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    locale: "fr-FR",
    timezoneId: "Africa/Lome",
    trace: "retain-on-failure",
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chrome installé sur la machine, sans téléchargement de navigateur.
        // E2E_BROWSER_CHANNEL=msedge pour Edge.
        channel: process.env.E2E_BROWSER_CHANNEL || "chrome",
      },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: databaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      APP_URL: E2E_BASE_URL,
      AUTH_URL: E2E_BASE_URL,
      // Jamais de vrai email : ENVIRONMENT=test (≠ production) impose le transport console.
      ENVIRONMENT: "test",
      EMAIL_OUTBOX_FILE: OUTBOX_FILE,
    },
  },
});
