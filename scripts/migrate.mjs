// Draait een .sql tegen de niet-productie-databases (zijsporen): de TEST-database en, indien ingesteld,
// de DEMO-database. Zo lopen test en demo nooit uit de pas met productie (schema-drift). Productie blijft
// bewust een handmatige stap.
//
// Gebruik:  npm run migrate:test -- supabase/schema-compleet-7-werkpool-vasthouden.sql
// Vereist:  SUPABASE_TEST_DB_URL in .env.local (Supabase test-project -> Settings -> Database ->
//           Connection string, Session pooler / IPv4). Optioneel: SUPABASE_DEMO_DB_URL voor de demo-DB.
//           Die strings bevatten het db-wachtwoord; .env.local is gitignored.
//
// Verifieer na een migratie altijd met de tests (npm run test:e2e), dat is het echte vangnet.

import { readFileSync } from "node:fs";
import pg from "pg";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Gebruik: npm run migrate:test -- <pad/naar.sql>");
  process.exit(1);
}

// Doelen: test is verplicht, demo optioneel (alleen als de env-var gezet is).
const doelen = [
  { naam: "test-DB", url: process.env.SUPABASE_TEST_DB_URL, verplicht: true },
  { naam: "demo-DB", url: process.env.SUPABASE_DEMO_DB_URL, verplicht: false },
];

if (!doelen[0].url) {
  console.error("SUPABASE_TEST_DB_URL ontbreekt in .env.local. Zet de TEST-DB-connectiestring erin.");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");

for (const doel of doelen) {
  if (!doel.url) {
    if (!doel.verplicht) console.log(`(${doel.naam} overgeslagen: geen connectiestring ingesteld)`);
    continue;
  }
  const client = new pg.Client({ connectionString: doel.url });
  try {
    await client.connect();
    await client.query(sql);
    // Forceer PostgREST om z'n schema-cache te herladen, zodat nieuwe kolommen meteen via de
    // REST-laag (waar de app doorheen praat) bruikbaar zijn. Zonder dit kan een run vlak na een
    // migratie op een stale cache vallen ("Could not find the 'X' column ... in the schema cache").
    await client.query("notify pgrst, 'reload schema'");
    console.log(`OK: ${sqlPath} gedraaid tegen de ${doel.naam} (schema-reload verstuurd).`);
  } catch (e) {
    console.error(`FOUT bij ${sqlPath} op de ${doel.naam}: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
