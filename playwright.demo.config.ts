import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Zelfde .env.test-preamble als de andere configs: draai tegen het test-zijspoor als dat bestaat.
const envTestPath = path.join(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const inCI = !!process.env.CI;
// Eigen poort, zodat de demo-webServer (DEMO_MODE=1) niet botst met de gewone e2e (3001).
const pwPort = process.env.PW_DEMO_PORT ?? "3002";

/**
 * Aparte e2e voor de DEMO-kant (het uitstalraam). Draait NIET mee met de gewone e2e: eigen testDir,
 * eigen webServer met DEMO_MODE=1 zodat de demo-routes actief zijn. global-setup seedt de demo onder een
 * eigen zaak ("Demo Keukenstudio"), los van de gewone e2e-data in dezelfde test-DB. Geen storageState:
 * de demo-reis begint uitgelogd (de beheerder meldt zich zelf aan). Draaien: npm run test:e2e:demo
 */
export default defineConfig({
  testDir: "./e2e-demo",
  globalSetup: "./e2e-demo/global-setup.ts",
  timeout: inCI ? 60_000 : 30_000,
  expect: { timeout: inCI ? 15_000 : 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: inCI ? 2 : 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${pwPort}`,
    trace: "on-first-retry",
    serviceWorkers: "block",
  },
  webServer: {
    command: `npm run dev -- -p ${pwPort}`,
    url: `http://localhost:${pwPort}`,
    reuseExistingServer: !inCI,
    stdout: "pipe",
    timeout: 120_000,
    // DEMO_MODE zet de demo-routes aan; SMS_DRY_RUN voorkomt dat de testserver ooit een echte SMS stuurt.
    env: { ...process.env, DEMO_MODE: "1", SMS_DRY_RUN: "1" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
