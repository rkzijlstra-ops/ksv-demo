// Zet de service-worker-versie automatisch uit het build-id, zodat niemand `public/sw.js` nog met de
// hand hoeft te bumpen. Elke deploy krijgt zo een verse versie -> de SW ruimt oude caches op en de
// "Nieuwe versie"-balk (src/components/SwRegistrar.tsx) verschijnt vanzelf.
//
// Werking: `public/sw.js` bevat de placeholder `ksv-__BUILD_ID__`. Dit script vervangt die door
// `ksv-<eerste 8 tekens van het build-id>`. Op Vercel komt het build-id uit VERCEL_GIT_COMMIT_SHA.
// Buiten Vercel (lokaal/dev) valt het terug op een arg of op "dev".
//
// Gebruik (gebeurt automatisch via het `prebuild`-script vóór `next build`):
//   node scripts/genereer-sw-versie.mjs
//   VERCEL_GIT_COMMIT_SHA=abcdef1234567890 node scripts/genereer-sw-versie.mjs
//   node scripts/genereer-sw-versie.mjs <build-id>   # expliciete fallback-id
//
// BELANGRIJK: in git staat altijd de placeholder; de gegenereerde waarde is alleen build-output.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const PLACEHOLDER = "__BUILD_ID__";

/**
 * Pure, los testbare functie. Vervangt elke placeholder `__BUILD_ID__` in de bron door de eerste
 * 8 tekens van het build-id, of door "dev" als er geen (leeg/ontbrekend) build-id is.
 * @param {string} bron - de inhoud van sw.js
 * @param {string|undefined|null} buildId - bv. VERCEL_GIT_COMMIT_SHA
 * @returns {string}
 */
export function vervangVersie(bron, buildId) {
  const kort = buildId ? String(buildId).slice(0, 8) : "dev";
  return bron.split(PLACEHOLDER).join(kort);
}

// Main: alleen draaien als dit bestand direct wordt aangeroepen (niet bij import in de test).
const directAangeroepen =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (directAangeroepen) {
  const swPad = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sw.js");
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.argv[2] || "";
  const bron = readFileSync(swPad, "utf8");
  const uit = vervangVersie(bron, buildId);
  writeFileSync(swPad, uit, "utf8");
  const versie = buildId ? String(buildId).slice(0, 8) : "dev";
  console.log(`sw.js versie gezet op ksv-${versie} (build-id: ${buildId || "leeg -> dev"}).`);
}
