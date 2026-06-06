import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, APP_URL } from "./test-env";

/**
 * Mail end-to-end: de monteur-opdracht-mail uit de verstuur-poort, INCLUSIEF de eerdere-rapporten-
 * historie. Maakt een testmonteur op een leesbaar +adres, plant hem een klus op een referentie waar
 * al een opgeleverd rapport op staat, en triggert de mail via de echte route (beheerder-sessie tegen
 * productie). Daarna is de mail in de BKM-mailbox te controleren (inhoud + historie-link).
 * Verstuurt echt, dus achter E2E_MAIL=1:
 *   E2E_MAIL=1 npx playwright test e2e/mail-opdracht.spec.ts
 */

test.use({
  baseURL: APP_URL,
  storageState: "e2e/.auth/beheerder-prod.json",
});

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_SECRET;

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

let testMonteurId = "";
let priorId = "";
let currentId = "";
let klant = "";
let rapportUrl = "";

test.beforeEach(async () => {
  test.skip(!process.env.E2E_MAIL, "Verstuurt echt een mail; draai met E2E_MAIL=1");

  const stamp = Date.now();
  klant = `OPDRMAIL ${stamp}`;
  const ref = `HIST${stamp}`;
  rapportUrl = `https://storage.example/rapport-${ref}.pdf`;
  const zaak = await db.getStandaardOpdrachtgever();

  // Testmonteur op een leesbaar +adres (mail komt zo in de BKM-inbox).
  const { data: maak, error } = await admin.auth.admin.createUser({
    email: `bkmkeukenmontage+optest${stamp}@gmail.com`,
    email_confirm: true,
  });
  if (error || !maak?.user) throw new Error(`Testmonteur aanmaken mislukt: ${error?.message}`);
  testMonteurId = maak.user.id;
  await admin
    .from("profielen")
    .insert({ id: testMonteurId, rol: "monteur", naam: "Optest Monteur", opdrachtgever_id: zaak?.id ?? null });

  // Eerdere, opgeleverde klus op dezelfde referentie (levert de historie + rapport-link).
  const prior = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: ref,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: testMonteurId,
    opdrachtgever_id: zaak?.id ?? null,
  });
  priorId = prior.id;
  await db.markeerOpgeleverd(priorId, rapportUrl);

  // Huidige klus op dezelfde referentie, ingepland op de testmonteur.
  const huidig = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: ref,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: testMonteurId,
    opdrachtgever_id: zaak?.id ?? null,
  });
  currentId = huidig.id;
  await db.planOpdracht(currentId, {
    toegewezen_aan: testMonteurId,
    monteur_naam: "Optest Monteur",
    startdatum: "2026-06-15",
    starttijd: null,
    duur_dagen: 1,
  });
});

test.afterEach(async () => {
  for (const id of [priorId, currentId]) {
    if (id) await admin.from("meldingen").delete().eq("id", id);
  }
  if (testMonteurId) await admin.auth.admin.deleteUser(testMonteurId); // profiel cascadeert mee
});

test("monteur-opdracht-mail wordt verstuurd met de eerdere-rapporten-historie", async ({ page }) => {
  const res = await page.request.post(`/api/opdrachten/${currentId}/mail-monteur`);
  expect(res.ok()).toBeTruthy();

  console.log(`OPDRMAIL klant="${klant}" rapportUrl=${rapportUrl}`);
});
