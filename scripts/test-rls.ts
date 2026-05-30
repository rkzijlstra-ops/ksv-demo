/**
 * RLS-isolatietest voor de KSV-demo.
 *
 * - Maakt (of vindt) twee users in auth.users: Reins echte account + een test-user `+rls-test`.
 * - Voegt via service-role twee opdrachten toe (één per user).
 * - Opent voor elke user een echte JWT-sessie (admin.generateLink -> verifyOtp).
 * - Selecteert via die per-user-sessie de RLS-TEST-rijen en bewijst isolatie.
 * - Ruimt de test-rijen achteraf op (test-users blijven staan).
 *
 * Run: node --env-file=.env.local --experimental-strip-types scripts/test-rls.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !PUBLISHABLE_KEY) {
  console.error("Missende env-vars (SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY).");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const REIN_EMAIL = "bkmkeukenmontage@gmail.com";
const ED_EMAIL = "bkmkeukenmontage+rls-test@gmail.com";

async function vindOfMaakUser(email: string): Promise<{ id: string; gemaakt: boolean }> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const bestaand = data.users.find((u) => u.email === email);
  if (bestaand) return { id: bestaand.id, gemaakt: false };

  const res = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (res.error) throw new Error(`createUser ${email}: ${res.error.message}`);
  return { id: res.data.user!.id, gemaakt: true };
}

async function sessieAls(email: string): Promise<SupabaseClient> {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error(`generateLink ${email}: ${link.error.message}`);
  const props = link.data.properties as { hashed_token?: string };
  if (!props.hashed_token) throw new Error(`generateLink ${email}: geen hashed_token in respons`);

  const anon = createClient(SUPABASE_URL!, PUBLISHABLE_KEY!);
  const verify = await anon.auth.verifyOtp({
    token_hash: props.hashed_token,
    type: "magiclink",
  });
  if (verify.error) throw new Error(`verifyOtp ${email}: ${verify.error.message}`);
  if (!verify.data.session) throw new Error(`verifyOtp ${email}: geen sessie terug`);
  return anon;
}

function veldenVoorOpdracht(klant: string, userId: string) {
  return {
    bron: "pdf",
    documenttype: "tekst",
    klant_naam: klant,
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    meldingen: [],
    user_id: userId,
    toegewezen_aan: null,
  };
}

function regel(s: string) {
  console.log(s);
}

async function main() {
  regel("=== KSV RLS-isolatietest ===\n");

  // 1) Users
  const rein = await vindOfMaakUser(REIN_EMAIL);
  const ed = await vindOfMaakUser(ED_EMAIL);
  regel(`Rein  (${REIN_EMAIL}): ${rein.id} ${rein.gemaakt ? "[nieuw]" : "[bestond al]"}`);
  regel(`Ed    (${ED_EMAIL}): ${ed.id} ${ed.gemaakt ? "[nieuw]" : "[bestond al]"}`);

  // 2) Cleanup eventuele oude test-rijen, daarna 2 verse rijen
  await admin.from("meldingen").delete().like("klant_naam", "RLS-TEST-%");

  const insReinReq = admin
    .from("meldingen")
    .insert(veldenVoorOpdracht("RLS-TEST-rein", rein.id))
    .select("id, klant_naam, user_id")
    .single();
  const insEdReq = admin
    .from("meldingen")
    .insert(veldenVoorOpdracht("RLS-TEST-ed", ed.id))
    .select("id, klant_naam, user_id")
    .single();
  const [insRein, insEd] = await Promise.all([insReinReq, insEdReq]);
  if (insRein.error) throw new Error(`insert Rein: ${insRein.error.message}`);
  if (insEd.error) throw new Error(`insert Ed: ${insEd.error.message}`);

  regel(`\nIngestoken (via service-role, bypasst RLS):`);
  regel(`  Reins rij: ${insRein.data.id}  klant=${insRein.data.klant_naam}`);
  regel(`  Eds rij:   ${insEd.data.id}  klant=${insEd.data.klant_naam}`);

  // 3) JWT-sessies via admin.generateLink + verifyOtp
  const reinClient = await sessieAls(REIN_EMAIL);
  const edClient = await sessieAls(ED_EMAIL);

  // 4) Query: 'select id, klant_naam, user_id from meldingen where klant_naam like RLS-TEST-%'
  //    onder elk van de twee JWT-sessies. RLS-policy: auth.uid() = user_id.
  regel(`\nQuery (beide sessies):`);
  regel(`  select id, klant_naam, user_id from meldingen where klant_naam like 'RLS-TEST-%';`);

  const reinSees = await reinClient
    .from("meldingen")
    .select("id, klant_naam, user_id")
    .like("klant_naam", "RLS-TEST-%");
  const edSees = await edClient
    .from("meldingen")
    .select("id, klant_naam, user_id")
    .like("klant_naam", "RLS-TEST-%");

  if (reinSees.error) throw new Error(`select als Rein: ${reinSees.error.message}`);
  if (edSees.error) throw new Error(`select als Ed: ${edSees.error.message}`);

  regel(`\n--- als Rein (${rein.id}) ---`);
  regel(JSON.stringify(reinSees.data, null, 2));
  regel(`\n--- als Ed (${ed.id}) ---`);
  regel(JSON.stringify(edSees.data, null, 2));

  // 5) Cross-read poging: Rein leest specifiek Eds rij-id op
  const reinLeestEd = await reinClient
    .from("meldingen")
    .select("id, klant_naam")
    .eq("id", insEd.data.id)
    .maybeSingle();
  const edLeestRein = await edClient
    .from("meldingen")
    .select("id, klant_naam")
    .eq("id", insRein.data.id)
    .maybeSingle();

  regel(`\nCross-read pogingen (specifiek andermans id opvragen):`);
  regel(`  Rein leest Eds rij: ${reinLeestEd.data === null ? "null (RLS blokkeert)" : JSON.stringify(reinLeestEd.data)}`);
  regel(`  Ed leest Reins rij: ${edLeestRein.data === null ? "null (RLS blokkeert)" : JSON.stringify(edLeestRein.data)}`);

  // 6) Validatie
  const reinIds = (reinSees.data ?? []).map((r) => r.id);
  const edIds = (edSees.data ?? []).map((r) => r.id);
  const reinIsoleert = reinIds.includes(insRein.data.id) && !reinIds.includes(insEd.data.id);
  const edIsoleert = edIds.includes(insEd.data.id) && !edIds.includes(insRein.data.id);
  const crossLeesGeblokkeerd = reinLeestEd.data === null && edLeestRein.data === null;

  regel(`\n=== Resultaat ===`);
  regel(`  Rein ziet alleen eigen rij:        ${reinIsoleert ? "JA" : "NEE"}`);
  regel(`  Ed ziet alleen eigen rij:          ${edIsoleert ? "JA" : "NEE"}`);
  regel(`  Cross-read op andermans id null:   ${crossLeesGeblokkeerd ? "JA" : "NEE"}`);

  const allesOk = reinIsoleert && edIsoleert && crossLeesGeblokkeerd;
  regel(`\n  RLS isoleert ${allesOk ? "VOLLEDIG ✓" : "NIET VOLLEDIG ✗"}`);

  // 7) Cleanup
  await admin.from("meldingen").delete().like("klant_naam", "RLS-TEST-%");
  regel(`\nTest-rijen opgeruimd. Test-user ${ED_EMAIL} blijft bestaan (kan opnieuw gebruikt worden).`);

  if (!allesOk) process.exit(1);
}

main().catch((err) => {
  console.error("Script faalde:", err);
  process.exit(1);
});
