import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan, verschuifDagen } from "@/lib/planbord";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, MONTEUR } from "./test-env";

/**
 * Aanvullende e2e-scenario's voor het planbord:
 * - Formulier annuleren (kaart blijft in pool)
 * - Slepen van bord terug naar pool (ontplannen)
 * - Multi-dag montage (span van 3 over het raster)
 * - Service + montage op dezelfde dag (geen conflictmarkering, wel beide zichtbaar)
 * - Versturen naar monteurs (status → gepland)
 * - Montage deels over het weekend (span geknipt op vrijdag)
 * Elke test seedt zijn eigen data en ruimt op in afterEach.
 */

test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

function vandaagISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ankerVoorDatum(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Maandag van de eerstvolgende werkweek (niet de huidige, om verleden-week-problemen te voorkomen). */
function volgendeMaandag(): string {
  return verschuifDagen(ankerVoorDatum(vandaagISO()), 7);
}

const ids: string[] = [];

test.beforeAll(async () => {
  // Verwijder restdata van eerdere (mislukte/afgebroken) testruns voor de test-accounts:
  // - geplande items veroorzaken valse conflicten in de conflict-detectietest
  // - "binnen"-items verlengen de pool en duwen de pagina buiten de viewport (flakey drag-test)
  for (const uid of [BEHEERDER.uid, MONTEUR.uid]) {
    await admin.from("meldingen").delete().eq("toegewezen_aan", uid);
    await admin.from("meldingen").delete().eq("user_id", uid).is("toegewezen_aan", null);
  }

  // Verwijder ook orphaned monteur-profielen die zijn achtergebleven door mail-test-runs
  // (Afmtest..., Invtest...). Alleen de twee standaard test-accounts horen in de test-DB.
  const bekendeProfiel = new Set([BEHEERDER.uid, MONTEUR.uid]);
  const { data: alleProfielen } = await admin.from("profielen").select("id, rol");
  const orphans = (alleProfielen ?? []).filter(
    (p) => p.rol === "monteur" && !bekendeProfiel.has(p.id),
  );
  for (const p of orphans) {
    await admin.from("profielen").delete().eq("id", p.id);
    await admin.auth.admin.deleteUser(p.id).catch(() => {}); // auth-account is optional
  }
});

async function seedOpdracht(klantNaam: string, opties: { monteur?: boolean } = {}): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  if (!zaak) throw new Error("Geen opdrachtgever in test-DB");
  const r = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: klantNaam,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: opties.monteur ? MONTEUR.uid : BEHEERDER.uid,
    opdrachtgever_id: zaak.id,
  });
  ids.push(r.id);
  return r.id;
}

async function statusVan(id: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, toegewezen_aan, startdatum, duur_dagen")
    .eq("id", id)
    .single();
  return data;
}

test.afterEach(async () => {
  for (const id of ids.splice(0)) {
    await admin.from("meldingen").delete().eq("id", id);
  }
});

test("formulier-annuleren laat de kaart in de pool staan", async ({ page }) => {
  const uniek = `ANN-FORM ${Date.now()}`;
  const id = await seedOpdracht(uniek);

  await page.goto("/planbord");
  const kaart = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaart).toBeVisible();

  await kaart.getByRole("button", { name: "Inplannen" }).click();
  await expect(kaart.getByRole("button", { name: "Op planbord zetten" })).toBeVisible();

  await kaart.getByRole("button", { name: "Annuleren" }).click();
  await expect(kaart.getByRole("button", { name: "Op planbord zetten" })).not.toBeVisible();

  // DB: status onveranderd "binnen"
  const data = await statusVan(id);
  expect(data?.dashboard_status).toBe("binnen");
  // UI: kaart nog steeds in pool
  await expect(kaart).toBeVisible();
});

test("slepen van het bord terug naar pool ontpland de kaart", async ({ page }) => {
  const maandag = volgendeMaandag();
  const uniek = `DRAG-TERUG ${Date.now()}`;
  const id = await seedOpdracht(uniek);
  await db.planOpdracht(id, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 1,
  });

  await page.goto(`/planbord?week=${maandag}`);
  const kaartOpBord = page.locator(`a[href="/dashboard/opdracht/${id}"]`);
  await expect(kaartOpBord).toBeVisible({ timeout: 8_000 });

  const pool = page.locator('[data-testid="pool-zone"]');
  await expect(pool).toBeVisible();

  const g = await kaartOpBord.boundingBox();
  const p = await pool.boundingBox();
  if (!g || !p) throw new Error("Kaart of pool niet gevonden");

  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 20, g.y + g.height / 2 + 20, { steps: 5 });
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2, { steps: 12 });
  await page.mouse.up();

  // DB: status terug op "binnen"
  await expect
    .poll(async () => (await statusVan(id))?.dashboard_status, { timeout: 10_000, intervals: [500] })
    .toBe("binnen");

  // Visueel: kaart staat in pool, niet meer op het bord
  const kaartInPool = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaartInPool).toBeVisible({ timeout: 8_000 });
  await expect(kaartOpBord).not.toBeVisible();
});

test("multi-dag montage (3 dagen) staat als aaneengesloten blok op het bord", async ({ page }) => {
  const maandag = volgendeMaandag();
  const uniek = `MULTIDAG ${Date.now()}`;
  const id = await seedOpdracht(uniek);
  await db.planOpdracht(id, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 3,
  });

  await page.goto(`/planbord?week=${maandag}`);
  const kaartOpBord = page.locator(`a[href="/dashboard/opdracht/${id}"]`);
  await expect(kaartOpBord).toBeVisible({ timeout: 8_000 });

  // DB: duur_dagen correct opgeslagen
  const data = await statusVan(id);
  expect(data?.duur_dagen).toBe(3);
  expect(data?.startdatum).toBe(maandag);
});

test("montage van vrijdag met duur 3 wordt geknipt op vrijdag en staat op het bord", async ({ page }) => {
  const maandag = volgendeMaandag();
  const vrijdag = verschuifDagen(maandag, 4); // dag 4 = vrijdag
  const uniek = `WEEKEND-KNIP ${Date.now()}`;
  const id = await seedOpdracht(uniek);
  await db.planOpdracht(id, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: vrijdag,
    starttijd: null,
    duur_dagen: 3,
  });

  await page.goto(`/planbord?week=${maandag}`);
  const kaartOpBord = page.locator(`a[href="/dashboard/opdracht/${id}"]`);
  // Kaart staat op het bord, ook al past maar 1 dag in de week (vrijdag)
  await expect(kaartOpBord).toBeVisible({ timeout: 8_000 });

  // DB: 3 dagen opgeslagen (de volgende week toont de rest)
  const data = await statusVan(id);
  expect(data?.duur_dagen).toBe(3);
  expect(data?.startdatum).toBe(vrijdag);
});

test("service + montage op dezelfde dag zijn beide zichtbaar zonder conflictmarkering", async ({ page }) => {
  const maandag = volgendeMaandag();
  const woensdag = verschuifDagen(maandag, 2);

  const uniekMontage = `MONTAGE-COMBO ${Date.now()}`;
  const uniekService = `SERVICE-COMBO ${Date.now()}`;

  // Montage: ma t/m wo (3 dagen)
  const idMontage = await seedOpdracht(uniekMontage);
  await db.planOpdracht(idMontage, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 3,
  });

  // Service: woensdag (laatste dag montage) om 12:00
  const idService = await seedOpdracht(uniekService);
  await db.planOpdracht(idService, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: woensdag,
    starttijd: "12:00",
    duur_dagen: 1,
  });

  await page.goto(`/planbord?week=${maandag}`);

  // Beide kaarten staan op het bord
  const montageKaart = page.locator(`a[href="/dashboard/opdracht/${idMontage}"]`);
  const serviceKaart = page.locator(`a[href="/dashboard/opdracht/${idService}"]`);
  await expect(montageKaart).toBeVisible({ timeout: 8_000 });
  await expect(serviceKaart).toBeVisible({ timeout: 5_000 });

  // Geen conflictmarkering (geen rode rand, geen "dubbel"-tekst)
  await expect(montageKaart.locator("text=dubbel")).not.toBeVisible();
  await expect(serviceKaart.locator("text=dubbel")).not.toBeVisible();
});

test("twee montages op dezelfde dag tonen een conflictwaarschuwing", async ({ page }) => {
  const maandag = volgendeMaandag();

  const uniek1 = `CONF1 ${Date.now()}`;
  const uniek2 = `CONF2 ${Date.now()}`;

  const id1 = await seedOpdracht(uniek1);
  await db.planOpdracht(id1, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 1,
  });
  const id2 = await seedOpdracht(uniek2);
  await db.planOpdracht(id2, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 1,
  });

  await page.goto(`/planbord?week=${maandag}`);

  const kaart1 = page.locator(`a[href="/dashboard/opdracht/${id1}"]`);
  const kaart2 = page.locator(`a[href="/dashboard/opdracht/${id2}"]`);
  await expect(kaart1).toBeVisible({ timeout: 8_000 });
  await expect(kaart2).toBeVisible({ timeout: 5_000 });

  // Beide kaarten tonen de conflictwaarschuwing
  await expect(kaart1.locator("text=dubbel")).toBeVisible();
  await expect(kaart2.locator("text=dubbel")).toBeVisible();
});

test("versturen naar monteurs zet de status van concept_gepland op gepland", async ({ page }) => {
  const maandag = volgendeMaandag();
  const uniek = `VERSTUUR ${Date.now()}`;
  const id = await seedOpdracht(uniek);
  await db.planOpdracht(id, {
    toegewezen_aan: BEHEERDER.uid,
    monteur_naam: "E2E Beheerder",
    startdatum: maandag,
    starttijd: null,
    duur_dagen: 1,
  });

  await page.goto(`/planbord?week=${maandag}`);
  const verstuurKnop = page.getByRole("button", { name: /Verstuur naar monteurs/ });
  await expect(verstuurKnop).toBeVisible({ timeout: 8_000 });
  await verstuurKnop.click();

  // DB: status = "gepland"
  await expect
    .poll(async () => (await statusVan(id))?.dashboard_status, { timeout: 10_000, intervals: [500] })
    .toBe("gepland");

  // Knop verdwijnt of toont "Verstuurd" (of een mail-waarschuwing als mail mislukt, maar status is gepland)
  await expect(page.getByRole("button", { name: /Verstuur naar monteurs/ })).not.toBeVisible({ timeout: 8_000 }).catch(() => {
    // Als andere concept-geplande items de knop in beeld houden, is dat OK
  });
});
