// Draait een .sql tegen de TEST-database (het zijspoor), zodat migraties op de test-DB zonder
// handwerk getest kunnen worden. Bewust ALLEEN test: productie blijft een handmatige, bewuste stap.
//
// Gebruik:  npm run migrate:test -- supabase/schema-compleet-7-werkpool-vasthouden.sql
// Vereist:  SUPABASE_TEST_DB_URL in .env.local (Supabase test-project -> Settings -> Database ->
//           Connection string). Die string bevat het db-wachtwoord; .env.local is gitignored.
//
// Verifieer na een migratie altijd met de tests (npm run test:e2e), dat is het echte vangnet.

import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.SUPABASE_TEST_DB_URL;
if (!url) {
  console.error("SUPABASE_TEST_DB_URL ontbreekt in .env.local. Zet de TEST-DB-connectiestring erin.");
  process.exit(1);
}
const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Gebruik: npm run migrate:test -- <pad/naar.sql>");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  // Forceer PostgREST om z'n schema-cache te herladen, zodat nieuwe kolommen meteen via de
  // REST-laag (waar de app doorheen praat) bruikbaar zijn. Zonder dit kan een e2e-run vlak na
  // een migratie op een stale cache vallen ("Could not find the 'X' column ... in the schema cache").
  await client.query("notify pgrst, 'reload schema'");
  console.log(`OK: ${sqlPath} gedraaid tegen de test-DB (schema-reload verstuurd).`);
} catch (e) {
  console.error(`FOUT bij ${sqlPath}: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
