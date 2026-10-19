import { defineConfig } from "@playwright/test";

// Serveurs dev déjà lancés (web :3001, Nest :3002) — pas de bloc webServer.
export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  workers: 2,
  retries: 0,
  // Compilation Next à l'aller initial : timeouts généreux.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
});
