import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Laad .env.test in process.env als het zijspoor actief is. De webServer-child erft dit, waardoor
// `next dev` de test-Supabase-URL/key gebruikt. Zonder dit laadt Next.js .env.local (productie),
// terwijl global-setup de auth-cookies aanmaakt voor de test-Supabase → mismatch → redirect /login.
// Next.js respecteert al gezette process.env-waarden (dotenv override:false), dus .env.local wint niet.
const envTestPath = path.join(__dirname, ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

// In de cloud (CI) draaien we tegen een kant-en-klare productie-build (`next start`) i.p.v. de
// dev-server: die compileert niet pagina-voor-pagina tijdens de test, dus snel en geen hang.
// Lokaal blijft het de vertrouwde `next dev`.
const inCI = !!process.env.CI;
const pwPort = process.env.PW_PORT ?? "3001";

/**
 * Browser-e2e voor de KSV demo-app (Kluslus). Lokaal tegen `next dev`, in CI tegen `next start`.
 * De login gaat via global-setup (programmatische sessie); elke test start ingelogd als beheerder.
 * Als .env.test aanwezig is, draaien tests tegen het test-Supabase-zijspoor. Draaien: `npx playwright test`.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  // In de cloud praat de US-runner met de EU-test-database: hogere latency dan lokaal. Daarom ruimere
  // timeouts in CI, zodat geseede/aangemaakte data de tijd krijgt om te verschijnen (lokaal blijft strak).
  timeout: inCI ? 60_000 : 30_000,
  expect: { timeout: inCI ? 15_000 : 8_000 },
  fullyParallel: false,
  workers: 1,
  // Eén herkansing: sommige UI-flows (oplevering met foto-upload + handtekening) zijn af en toe traag
  // en pollen de DB met een timeout. Een retry vangt zo'n incidentele timing-flake op zonder de poort
  // te verzwakken; een echt kapotte test faalt ook bij de retry.
  // In de cloud een extra herkansing: de foto-upload-flows zijn daar net wat trager/wisselvalliger.
  retries: inCI ? 2 : 1,
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
    // Ook in CI tegen `next dev` (zoals lokaal, waar alle tests groen zijn). De productie-build (`next
    // start`) gaf in de CI-omgeving valse "data verschijnt niet"-fouten die in de echte productie op
    // Vercel niet optreden; de build zelf wordt nog gevalideerd door de aparte build-stap + Vercel.
    command: `npm run dev -- -p ${pwPort}`,
    url: `http://localhost:${pwPort}`,
    reuseExistingServer: !inCI,
    stdout: "pipe",
    timeout: 120_000,
    // De testserver mag NOOIT echte SMS sturen (kost geld, en een trage gateway laat de e2e hangen).
    // Dit dwingt dry-run af, los van wat in .env.local/.env.test staat.
    env: { ...process.env, SMS_DRY_RUN: "1" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
