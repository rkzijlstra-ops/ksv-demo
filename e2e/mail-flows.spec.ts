import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, APP_URL, BEHEERDER as BEHEERDER_ACC } from "./test-env";

/**
 * De overige mail-flows end-to-end tegen productie: spoedmelding, uitnodiging, afmelding,
 * ontplannen (terug naar de pool) en annulering.
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
let accUid2 = "";
let accNieuwAangemaakt = false;

test.beforeEach(() => {
  test.skip(!process.env.E2E_MAIL, "Verstuurt echt een mail; draai met E2E_MAIL=1");
  oId = "";
  mId = "";
  accUid = "";
  accUid2 = "";
  accNieuwAangemaakt = false;
});

test.afterEach(async () => {
  if (mId) await admin.from("meldingen").delete().eq("id", mId);
  if (oId) await admin.from("meldingen").delete().eq("id", oId);
  if (accUid && accNieuwAangemaakt) await admin.auth.admin.deleteUser(accUid).catch(() => {});
  if (accUid2) await admin.auth.admin.deleteUser(accUid2).catch(() => {});
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
  accUid = maak!.user!.id;
  accNieuwAangemaakt = true; // veiligheidsvangnet: API ruimt op, afterEach ook als fallback
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: `Afmtest ${stamp}`, opdrachtgever_id: zaak?.id ?? null });

  const res = await page.request.delete(`/api/gebruikers/${accUid}`);
  expect(res.ok()).toBeTruthy(); // verwijdert het account + stuurt de afmeldmail
  // Na succesvolle verwijdering bestaat het account niet meer; afterEach-cleanup is dan no-op.
  console.log(`AFMELDMAIL email=${email}`);
});

test("ontplan-mail wordt naar de monteur verstuurd als een verstuurde klus terug naar de pool gaat", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+ontplantest${stamp}@gmail.com`;
  const klant = `ONTPLANMAIL ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
  accUid = maak!.user!.id;
  accNieuwAangemaakt = true;
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: "Ontplan Monteur", opdrachtgever_id: zaak?.id ?? null });
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `OP${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  await db.planOpdracht(oId, { toegewezen_aan: accUid, monteur_naam: "Ontplan Monteur", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(oId, { toegewezen_aan: accUid, monteur_naam: "Ontplan Monteur", startdatum: "2026-06-15", starttijd: null });

  const res = await page.request.post(`/api/opdrachten/${oId}/ontplannen`);
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).gemaild).toBe(true);
  console.log(`ONTPLANMAIL klant="${klant}" naar=${email} (planning@kluslus.nl)`);
});

test("annuleer-mail wordt naar de monteur verstuurd als een verstuurde klus wordt geannuleerd", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+anntest${stamp}@gmail.com`;
  const klant = `ANNMAIL ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
  accUid = maak!.user!.id;
  accNieuwAangemaakt = true;
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: "Anntest Monteur", opdrachtgever_id: zaak?.id ?? null });
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
  console.log(`ANNULEERMAIL klant="${klant}" naar=${email} (planning@kluslus.nl)`);
});

test("verzet-mail: opnieuw versturen na een datum-wijziging (zelfde monteur) meldt 'verzet', niet 'nieuw'", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+verzettest${stamp}@gmail.com`;
  const klant = `VERZETMAIL ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
  accUid = maak!.user!.id;
  accNieuwAangemaakt = true;
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: "Verzet Monteur", opdrachtgever_id: zaak?.id ?? null });
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `VZ${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  // Plan + verstuur op de eerste datum, daarna verplaatsen naar een andere datum (zelfde monteur).
  await db.planOpdracht(oId, { toegewezen_aan: accUid, monteur_naam: "Verzet Monteur", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(oId, { toegewezen_aan: accUid, monteur_naam: "Verzet Monteur", startdatum: "2026-06-15", starttijd: null });
  await db.wijzigOpdracht(
    oId,
    { toegewezen_aan: accUid, monteur_naam: "Verzet Monteur", startdatum: "2026-06-22", starttijd: null, duur_dagen: 1 },
    "gepland",
    { toegewezen_aan: accUid, monteur_naam: "Verzet Monteur", startdatum: "2026-06-15", starttijd: null },
  );

  const res = await page.request.post(`/api/dashboard/versturen`, { data: { ids: [oId] } });
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).mailWaarschuwing).toBeFalsy(); // geen mail/SMS-fout = beide gelukt
  console.log(`VERZETMAIL klant="${klant}" naar=${email}: mail + SMS moeten "verzet naar 22 jun" melden, niet "nieuwe klus"`);
});

test("wissel-mail: oude monteur krijgt de annulering, nieuwe monteur de klus", async ({ page }) => {
  const stamp = Date.now();
  const emailA = `bkmkeukenmontage+wisselA${stamp}@gmail.com`;
  const emailB = `bkmkeukenmontage+wisselB${stamp}@gmail.com`;
  const klant = `WISSELMAIL ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maakA } = await admin.auth.admin.createUser({ email: emailA, email_confirm: true });
  accUid = maakA!.user!.id;
  accNieuwAangemaakt = true;
  await admin
    .from("profielen")
    .insert({ id: accUid, rol: "monteur", naam: "Wissel Monteur A", opdrachtgever_id: zaak?.id ?? null });
  const { data: maakB } = await admin.auth.admin.createUser({ email: emailB, email_confirm: true });
  accUid2 = maakB!.user!.id;
  await admin
    .from("profielen")
    .insert({ id: accUid2, rol: "monteur", naam: "Wissel Monteur B", opdrachtgever_id: zaak?.id ?? null });
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `WS${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  // Plan + verstuur aan monteur A, daarna schuiven naar monteur B (wissel), nog niet opnieuw verstuurd.
  await db.planOpdracht(oId, { toegewezen_aan: accUid, monteur_naam: "Wissel Monteur A", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(oId, { toegewezen_aan: accUid, monteur_naam: "Wissel Monteur A", startdatum: "2026-06-15", starttijd: null });
  await db.wijzigOpdracht(
    oId,
    { toegewezen_aan: accUid2, monteur_naam: "Wissel Monteur B", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 },
    "gepland",
    { toegewezen_aan: accUid, monteur_naam: "Wissel Monteur A", startdatum: "2026-06-15", starttijd: null },
  );

  const res = await page.request.post(`/api/dashboard/versturen`, { data: { ids: [oId] } });
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).mailWaarschuwing).toBeFalsy();
  console.log(`WISSELMAIL klant="${klant}": A (${emailA}) moet de annulering-mail+SMS krijgen, B (${emailB}) de nieuwe klus`);
});
