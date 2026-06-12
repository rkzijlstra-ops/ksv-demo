import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Zelfde .env.test-preamble als playwright.config.ts: als het test-zijspoor bestaat, draaien we
// daar tegen (nooit productie-data op de screenshots). Next.js respecteert al gezette process.env.
const envTestPath = path.join(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const pwPort = process.env.PW_PORT ?? "3001";

/**
 * Aparte config voor het genereren van handleiding-screenshots. Draait NIET mee met de gewone
 * e2e (eigen testDir). Eigen global-setup zodat de monteur-sessie altijd vers is. Mobiel
 * viewport (Pixel 7), want de monteur gebruikt de app op zijn telefoon.
 * Draaien: npm run screenshots:handleiding
 */
export default defineConfig({
  testDir: "./e2e-handleiding",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${pwPort}`,
    storageState: "e2e/.auth/monteur.json",
    serviceWorkers: "block",
    ...devices["Pixel 7"],
  },
  webServer: {
    command: `npm run dev -- -p ${pwPort}`,
    url: `http://localhost:${pwPort}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, SMS_DRY_RUN: "1" },
  },
});
