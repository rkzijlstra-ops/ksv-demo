/**
 * Vult de DEMO-database met een schone, gevulde staat (zie src/lib/demo-seed.ts).
 *
 * Vereist in .env.local: SUPABASE_DEMO_URL + SUPABASE_DEMO_SECRET_KEY (van het demo-Supabase-project).
 * Draaien: npm run seed:demo
 *
 * VEILIG: draait uitsluitend tegen het demo-project (eigen URL + service-key). Wist de demo-data en
 * vult opnieuw. Nooit tegen productie richten.
 */

import { createClient } from "@supabase/supabase-js";
import { seedDemo } from "../src/lib/demo-seed.ts";

const url = process.env.SUPABASE_DEMO_URL;
const key = process.env.SUPABASE_DEMO_SECRET_KEY;

if (!url || !key) {
  console.error(
    "\n✗ SUPABASE_DEMO_URL en/of SUPABASE_DEMO_SECRET_KEY ontbreekt in .env.local.\n" +
      "  Vul de URL en de service_role-key van het DEMO-Supabase-project in.\n",
  );
  process.exit(1);
}

// Extra grendel: nooit per ongeluk tegen het productie-project draaien.
if (process.env.SUPABASE_URL && url === process.env.SUPABASE_URL) {
  console.error("\n✗ SUPABASE_DEMO_URL is gelijk aan SUPABASE_URL (productie). Gestopt.\n");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

seedDemo(admin)
  .then((r) => {
    console.log(`\n✓ Demo gevuld: ${r.aantalKlussen} klussen, accounts:`, r.accounts);
    console.log("");
  })
  .catch((e) => {
    console.error("\n✗ Seed mislukt:", (e as Error).message || e);
    process.exit(1);
  });
