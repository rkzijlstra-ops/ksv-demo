// Zet een VERSE demo-database volledig op: eerst de basis-bootstrap (test-schema.sql, t/m blok 8),
// daarna alle incrementele blokken vanaf 9 in numerieke volgorde (idempotent, dus toekomstbestendig).
// Draait UITSLUITEND tegen SUPABASE_DEMO_DB_URL (de demo-DB), nooit tegen test of productie.
//
// Gebruik:  node --env-file=.env.local scripts/provision-demo.mjs
// Daarna:   npm run seed:demo

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.SUPABASE_DEMO_DB_URL;
if (!url) {
  console.error("SUPABASE_DEMO_DB_URL ontbreekt in .env.local.");
  process.exit(1);
}
// Veiligheidsgrendel: nooit tegen de test- of productie-DB.
if (process.env.SUPABASE_TEST_DB_URL && url === process.env.SUPABASE_TEST_DB_URL) {
  console.error("SUPABASE_DEMO_DB_URL is gelijk aan de TEST-DB. Gestopt.");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase");

// Basis-bootstrap eerst.
const bestanden = [path.join(dir, "test-schema.sql")];

// Daarna alle schema-compleet-N.sql met N >= 9, numeriek oplopend.
const later = readdirSync(dir)
  .map((f) => ({ f, m: f.match(/^schema-compleet-(\d+)/) }))
  .filter((x) => x.m && Number(x.m[1]) >= 9)
  .sort((a, b) => Number(a.m[1]) - Number(b.m[1]))
  .map((x) => path.join(dir, x.f));
bestanden.push(...later);

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  for (const bestand of bestanden) {
    const sql = readFileSync(bestand, "utf8");
    await client.query(sql);
    console.log(`OK: ${path.basename(bestand)}`);
  }
  await client.query("notify pgrst, 'reload schema'");
  console.log(`\n✓ Demo-DB volledig opgezet (${bestanden.length} bestanden). Draai nu: npm run seed:demo`);
} catch (e) {
  console.error(`\n✗ FOUT: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
