import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, APP_URL, BEHEERDER as BEHEERDER_ACC } from "./test-env";

/**
 * De overige mail-flows end-to-end tegen productie: spoedmelding, uitnodiging en afmelding.
 * Triggert de echte routes met een beheerder-sessie; daarna in de BKM-mailbox te controleren.
 * Verstuurt echt, dus achter E2E_MAIL=1:
 *   E2E_MAIL=1 npx playwright test e2e/mail-flows.spec.ts
 */

test.use({
  baseURL: APP_URL,
  storageState: "e2e/.auth/beheerder-prod.json",
});

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_SECRET;
const BEHEERDER = BEHEERDER_ACC.uid;

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

let oId = "";
let mId = "";
let accUid = "";
let accNieuwAangemaakt = false;

test.beforeEach(() => {
  test.skip(!process.env.E2E_MAIL, "Verstuurt echt een mail; draai met E2E_MAIL=1");
  oId = "";
  mId = "";
  accUid = "";
  accNieuwAangemaakt = false;
});

test.afterEach(async () => {
  if (mId) await admin.from("meldingen").delete().eq("id", mId);
  if (oId) await admin.from("meldingen").delete().eq("id", oId);
  if (accUid && accNieuwAangemaakt) await admin.auth.admin.deleteUser(accUid).catch(() => {});
});

async function zoekUidOpEmail(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

test("spoedmelding-mail wordt naar kantoor verstuurd", async ({ page }) => {
  const stamp = Date.now();
  const klant = `SPOEDTEST ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `SP${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    toegewezen_aan: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  const { data: melding } = await admin
    .from("meldingen")
    .insert({
      bron: "monteur",
      opdracht_id: oId,
      spoed: true,
      ruwe_tekst: `Lekkage onder de spoelbak ${stamp}`,
      foto_urls: [],
      meldingen: [],
      user_id: BEHEERDER,
      status: "concept",
    })
    .select("id")
    .single();
  mId = melding!.id;

  const res = await page.request.post(`/api/meldingen/${mId}/spoed-versturen`);
  expect(res.ok()).toBeTruthy();
  console.log(`SPOEDMAIL klant="${klant}"`);
});

test("uitnodigingsmail wordt naar de nieuwe gebruiker verstuurd", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+invtest${stamp}@gmail.com`;
  const res = await page.request.post(`/api/mensen/uitnodigen`, {
    data: { naam: `Invtest ${stamp}`, email, rol: "monteur" },
  });
  expect(res.ok()).toBeTruthy();
  accUid = (await zoekUidOpEmail(email)) ?? "";
  accNieuwAangemaakt = true; // de API maakte dit account; altijd opruimen in afterEach
  console.log(`INVITEMAIL email=${email}`);
});

test("afmeldmail wordt verstuurd als een gebruiker wordt verwijderd", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+afmtest${stamp}@gmail.com`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
  accUid = maak!.user.id;
  accNieuwAangemaakt = true; // veiligheidsvangnet: API ruimt op, afterEach ook als fallback
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: `Afmtest ${stamp}`, opdrachtgever_id: zaak?.id ?? null });

  const res = await page.request.delete(`/api/gebruikers/${accUid}`);
  expect(res.ok()).toBeTruthy(); // verwijdert het account + stuurt de afmeldmail
  // Na succesvolle verwijdering bestaat het account niet meer; afterEach-cleanup is dan no-op.
  console.log(`AFMELDMAIL email=${email}`);
});

test("annuleer-mail wordt naar de monteur verstuurd als een verstuurde klus wordt geannuleerd", async ({ page }) => {
  const stamp = Date.now();
  // Resend free tier staat in testmodus alleen toe te sturen naar het account-eigenaar-adres.
  // Gebruik dat adres als testmonteur zodat de verzending slaagt.
  const email = "bkmkeukenmontage@gmail.com";
  const klant = `ANNMAIL ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  // Gebruiker bestaat mogelijk al in de test-DB van een vorige run; zoek of maak.
  const { data: lijstData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const bestaand = lijstData?.users?.find((u) => u.email?.toLowerCase() === email);
  if (bestaand) {
    accUid = bestaand.id;
  } else {
    const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
    accUid = maak!.user.id;
    accNieuwAangemaakt = true;
  }
  await admin
    .from("profielen")
    .upsert({ id: accUid, rol: "monteur", naam: "Anntest Monteur", opdrachtgever_id: zaak?.id ?? null }, { onConflict: "id" });
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `AM${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  await db.planOpdracht(oId, { toegewezen_aan: accUid, monteur_naam: "Anntest Monteur", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(oId, { toegewezen_aan: accUid, monteur_naam: "Anntest Monteur", startdatum: "2026-06-15", starttijd: null });

  const res = await page.request.post(`/api/opdrachten/${oId}/annuleren`);
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).gemaild).toBe(true);
  console.log(`ANNULEERMAIL klant="${klant}" naar=${email}`);
});
