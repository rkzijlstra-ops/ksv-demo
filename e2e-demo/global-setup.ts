import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET } from "../e2e/test-env";
import { seedDemo } from "../src/lib/demo-seed";

/**
 * Zet de demo klaar vóór de demo-e2e: seedt onder de eigen zaak "Demo Keukenstudio" in de test-DB
 * (los van de gewone e2e-data). Ruimt ook eerdere zelf-aangemelde demo-monteurs op (namespace-scoped).
 * Zonder deze seed bestaat het kantoor-account niet en geeft /api/demo/word-beheerder 503.
 */
export default async function globalSetup() {
  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    throw new Error("Supabase-env ontbreekt voor demo-e2e (.env.test of .env.local)");
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
  await seedDemo(admin);
}
