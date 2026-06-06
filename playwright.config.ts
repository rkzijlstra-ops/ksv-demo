import { defineConfig, devices } from "@playwright/test";

/**
 * Browser-e2e voor de KSV demo-app (Kluslus). Draait tegen een lokale `next dev` op poort 3000.
 * De login gaat via global-setup (programmatische sessie); elke test start ingelogd als beheerder.
 * Let op: hit dezelfde Supabase als productie (één project), dus tests die data maken moeten zelf
 * opruimen. Draaien: `npx playwright test`.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  // Poort via env (PW_PORT), standaard 3001 omdat hier vaak al een dev-server van dit project draait.
  // reuseExistingServer hergebruikt een draaiende server; anders start Playwright er zelf een.
  use: {
    baseURL: `http://localhost:${process.env.PW_PORT ?? "3001"}`,
    storageState: "e2e/.auth/beheerder.json",
    trace: "on-first-retry",
    // De PWA-service-worker testen we niet; uitschakelen voorkomt dat hij fetches onderschept.
    serviceWorkers: "block",
  },
  webServer: {
    command: `npm run dev -- -p ${process.env.PW_PORT ?? "3001"}`,
    url: `http://localhost:${process.env.PW_PORT ?? "3001"}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
