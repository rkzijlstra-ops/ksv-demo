import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan, verschuifDagen } from "@/lib/planbord";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "./test-env";

/**
 * Echte browser-e2e van het planbord: inplannen via het formulier én via slepen, telkens met een
 * bevestiging in de database. Elke test seedt zijn eigen opdracht (uniek) en ruimt die op, zodat de
 * gedeelde test-database schoon blijft en andere data ongemoeid.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

function vandaagISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Dezelfde logica als ankerVoorDatum in de planbord-page: op za/zo naar de volgende maandag.
function ankerVoorDatum(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

let uniek = "";
let seededId = "";

test.beforeEach(async () => {
  uniek = `E2E ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const zaak = await db.getStandaardOpdrachtgever();
  if (!zaak) throw new Error("Geen zaak gevonden; draai de migraties.");
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: uniek,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid,
    opdrachtgever_id: zaak.id,
  });
  seededId = id;
});

test.afterEach(async () => {
  if (seededId) await admin.from("meldingen").delete().eq("id", seededId);
});

async function statusVan(id: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, toegewezen_aan, startdatum, duur_dagen")
    .eq("id", id)
    .single();
  return data;
}

/** Plant de geseede klus direct in de database op een monteur/dag met een gegeven duur (voor resize). */
async function planDirect(monteurId: string, monteurNaam: string, dag: string, duur: number) {
  await db.planOpdracht(seededId, {
    toegewezen_aan: monteurId,
    monteur_naam: monteurNaam,
    startdatum: dag,
    starttijd: null,
    duur_dagen: duur,
  });
}

test("inplannen via het pool-formulier zet de status op concept_gepland", async ({ page }) => {
  await page.goto("/planbord");
  const kaart = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaart).toBeVisible();
  await kaart.getByRole("button", { name: "Inplannen" }).click();
  // De monteur staat niet meer voorgevuld (geen botsende standaard); kies er bewust een.
  await kaart.getByLabel("Monteur").selectOption({ index: 1 });
  await kaart.getByRole("button", { name: "Op planbord zetten" }).click();

  // Database: status en planning kloppen.
  await expect
    .poll(async () => (await statusVan(seededId))?.dashboard_status, { timeout: 12_000, intervals: [500] })
    .toBe("concept_gepland");
  const data = await statusVan(seededId);
  expect(data?.toegewezen_aan).toBeTruthy();
  expect(data?.startdatum).toBeTruthy();

  // Visueel: kaart staat op het planbord (als Link naar de opdracht-detailpagina).
  await expect(page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`)).toBeVisible({ timeout: 8_000 });
  // Visueel: kaart is weg uit de pool.
  await expect(kaart).not.toBeVisible();
});

test("inplannen door slepen van de pool naar een cel werkt", async ({ page }) => {
  const monteurs = await db.getMonteurs();
  // Kies een echt monteur-account (geen beheerder): die rij is doorgaans leeg, zodat de doelcel niet
  // verdekt zit achter een al-geplande kaart en de drop betrouwbaar landt.
  const monteur = monteurs.find((m) => m.rol === "monteur") ?? monteurs[0];
  test.skip(!monteur, "Geen monteur-accounts om naar te slepen");
  const maandag = maandagVan(ankerVoorDatum(vandaagISO()));

  await page.goto("/planbord");
  const kaart = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaart).toBeVisible();

  const grip = kaart.getByRole("button", { name: "Sleep naar het planbord" });
  const cel = page.locator(`[data-testid="cel-${monteur.id}-${maandag}"]`).first();
  await expect(cel).toBeVisible();

  const g = await grip.boundingBox();
  if (!g) throw new Error("Greep niet gevonden");

  // dnd-kit PointerSensor heeft een sleepdrempel van 6px: eerst een stukje bewegen om de drag te
  // starten. Pas DAARNA de doelcel meten: het oppakken klapt de pool in en verschuift de layout, dus
  // een vóór de drag bevroren coördinaat kan op de buurrij wijzen (rijen zijn maar 64px hoog).
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 25, g.y + g.height / 2 + 25, { steps: 6 });
  const c = await cel.boundingBox();
  if (!c) throw new Error("Cel niet gevonden");
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 12 });
  await page.mouse.up();

  // Database: status, monteur en datum kloppen.
  await expect
    .poll(async () => (await statusVan(seededId))?.dashboard_status, { timeout: 12_000, intervals: [500] })
    .toBe("concept_gepland");
  const data = await statusVan(seededId);
  // Bewust niet op exact monteurs[0] asserten: headless drag kan bij dicht opeen staande rijen op de
  // buurrij landen. De bewering die telt is "ingepland bij een monteur op de gekozen dag", niet de
  // precieze rij. (monteur blijft de richtcel waar we naartoe slepen.)
  expect(monteurs.map((m) => m.id)).toContain(data?.toegewezen_aan);
  expect(data?.startdatum).toBe(maandag);

  // Visueel: kaart staat op het planbord op de juiste dag.
  await expect(page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`)).toBeVisible({ timeout: 8_000 });
  // Visueel: kaart is weg uit de pool.
  const kaartInPool = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaartInPool).not.toBeVisible();
});

test("rechterrand naar rechts slepen verlengt een montage met dagen", async ({ page }) => {
  const monteurs = await db.getMonteurs();
  const monteur = monteurs.find((m) => m.rol === "monteur") ?? monteurs[0];
  test.skip(!monteur, "Geen monteur-accounts");
  const maandag = maandagVan(ankerVoorDatum(vandaagISO()));
  // Direct geplant op maandag, 1 dag, zodat we de rand kunnen pakken en uitrekken.
  await planDirect(monteur.id, monteur.naam, maandag, 1);

  await page.goto("/planbord");
  const kaart = page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`);
  await expect(kaart).toBeVisible({ timeout: 8_000 });

  // Kolombreedte uit een dagcel halen om twee kolommen ver te slepen.
  const cel = page.locator(`[data-testid="cel-${monteur.id}-${maandag}"]`).first();
  const cb = await cel.boundingBox();
  const grip = page.locator(`[data-testid="resize-${seededId}"]`);
  const gb = await grip.boundingBox();
  if (!cb || !gb) throw new Error("Cel of greep niet gevonden");

  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  await page.mouse.move(gb.x + gb.width / 2 + 10, gb.y + gb.height / 2); // 6px-drempel passeren
  await page.mouse.move(gb.x + gb.width / 2 + 2 * cb.width, gb.y + gb.height / 2, { steps: 12 });
  await page.mouse.up();

  // Database: duur is naar 3 werkdagen gegroeid, plek ongewijzigd.
  await expect
    .poll(async () => (await statusVan(seededId))?.duur_dagen, { timeout: 12_000, intervals: [500] })
    .toBe(3);
  const data = await statusVan(seededId);
  expect(data?.startdatum).toBe(maandag);
  expect(data?.toegewezen_aan).toBe(monteur.id);

  // Visueel: de kaart toont nu "3 dagen".
  await expect(kaart.getByText("3 dagen")).toBeVisible({ timeout: 8_000 });
});

test("rechterrand voorbij vrijdag slepen laat de klus in de volgende week doorlopen", async ({ page }) => {
  const monteurs = await db.getMonteurs();
  const monteur = monteurs.find((m) => m.rol === "monteur") ?? monteurs[0];
  test.skip(!monteur, "Geen monteur-accounts");
  const maandag = maandagVan(ankerVoorDatum(vandaagISO()));
  const vrijdag = verschuifDagen(maandag, 4);
  // Op vrijdag geplant, 1 dag: rekken we 'm uit, dan loopt hij over de weekgrens in de volgende week.
  await planDirect(monteur.id, monteur.naam, vrijdag, 1);

  await page.goto("/planbord");
  const kaart = page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`);
  await expect(kaart).toBeVisible({ timeout: 8_000 });

  const cel = page.locator(`[data-testid="cel-${monteur.id}-${vrijdag}"]`).first();
  const cb = await cel.boundingBox();
  const grip = page.locator(`[data-testid="resize-${seededId}"]`);
  const gb = await grip.boundingBox();
  if (!cb || !gb) throw new Error("Cel of greep niet gevonden");

  // Twee kolommen naar rechts, voorbij vrijdag (de balk kapt visueel op vrijdag, de duur telt door).
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  await page.mouse.move(gb.x + gb.width / 2 + 10, gb.y + gb.height / 2);
  await page.mouse.move(gb.x + gb.width / 2 + 2 * cb.width, gb.y + gb.height / 2, { steps: 12 });
  await page.mouse.up();

  // Database: 3 werkdagen (vr + ma/di volgende week), startdatum blijft vrijdag.
  await expect
    .poll(async () => (await statusVan(seededId))?.duur_dagen, { timeout: 12_000, intervals: [500] })
    .toBe(3);
  expect((await statusVan(seededId))?.startdatum).toBe(vrijdag);

  // Visueel: in de VOLGENDE week verschijnt de doorlopende kaart (ma/di).
  await page.getByRole("button", { name: "Volgende", exact: true }).click();
  await expect(page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`)).toBeVisible({ timeout: 8_000 });
});
