import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET, OPDRACHTGEVER_EMAIL } from "./test-env";

/**
 * Ruimt na de e2e-run op: de tijdelijke test-opdrachtgever, én test-klussen die de e2e-tests aanmaken
 * (herkenbaar aan hun vaste prefixen). Bewust GEEN brede wis: handmatig ingevoerde test-data (andere
 * namen) blijft staan, zodat de gedeelde test-database veilig is voor handmatig testwerk op kluslus-test.
 */
export const E2E_KLUS_PREFIXEN = ["E2E %", "ZELF %", "WERKOMS %", "KANTOOR %", "VERPLAATS %", "ONTPLAN %", "TERUG %"];

/**
 * De kern van de opruiming: verwijder alleen klussen waarvan de klant_naam op een vaste e2e-prefix
 * begint. Puur prefix-gescoped, dus handmatige keuringsdata met een andere naam blijft staan. Apart
 * geëxporteerd zodat de isolatie-test exact deze logica kan aanroepen (FASE 5, isolatie.int.test.ts).
 */
export async function ruimE2eKlussenOp(admin: SupabaseClient) {
  for (const p of E2E_KLUS_PREFIXEN) {
    await admin.from("meldingen").delete().like("klant_naam", p).then(() => {}, () => {});
  }
}

export default async function globalTeardown() {
  if (!SUPABASE_URL || !SUPABASE_SECRET) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });

  // E2e-klus-restjes opruimen (alleen de eigen test-prefixen), zodat het gedeelde bord niet vervuilt.
  await ruimE2eKlussenOp(admin);

  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const uid = data?.users?.find((u) => u.email?.toLowerCase() === OPDRACHTGEVER_EMAIL)?.id;
  if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {}); // profiel cascadeert mee
}
