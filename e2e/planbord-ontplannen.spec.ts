import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan } from "@/lib/planbord";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "./test-env";

/**
 * Het gat dat het testdekking-register noemde: de bevestigingsdialoog bij ontplannen op het planbord.
 * Een al bevestigde klus terug naar de pool slepen mag NIET stil gebeuren; er verschijnt een dialoog
 * ("Van de planning halen?"). "Nee" laat alles staan, "Ja" ontplant (status binnen, toewijzing leeg).
 * Grote viewport zodat bord én pool in beeld staan (de drag mist anders coördinaten).
 */

test.use({ viewport: { width: 1280, height: 2000 } });

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

let uniek = "";
let seededId = "";
let monteurId = "";

async function statusVan(id: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, toegewezen_aan, startdatum")
    .eq("id", id)
    .single();
  return data;
}

test.beforeEach(async () => {
  const monteurs = await db.getMonteurs();
  test.skip(monteurs.length === 0, "Geen monteur-accounts om op het bord te plaatsen");
  const monteur = monteurs[0];
  monteurId = monteur.id;
  const maandag = maandagVan(ankerVoorDatum(vandaagISO()));

  uniek = `ONTPLAN ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
  // Op het bord brengen tot en met 'bevestigd': plannen -> verstuurd -> bevestigd.
  const plek = { toegewezen_aan: monteur.id, monteur_naam: monteur.naam, startdatum: maandag, starttijd: null };
  await db.planOpdracht(seededId, { ...plek, duur_dagen: 1 });
  await db.markeerVerzonden(seededId, plek);
  await db.bevestigOntvangst(seededId);
});

test.afterEach(async () => {
  if (seededId) await admin.from("meldingen").delete().eq("id", seededId);
});

/**
 * Sleept de geplaatste kaart van het bord naar de pool-zone (met de 6px dnd-kit-drempel) en wacht
 * tot de bevestigingsdialoog staat. Beweegt de muis daarna weg van de pool: dnd-kit ruimt na de drop
 * document-level pointer-listeners op, en zonder die verplaatsing wordt de eerstvolgende klik op een
 * dialoog-knop soms opgegeten (focus wel, onClick niet). Geeft de dialoog-locator terug.
 */
async function sleepKaartNaarPool(page: import("@playwright/test").Page) {
  const kaart = page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`);
  await expect(kaart).toBeVisible();
  const poolZone = page.locator('[data-testid="pool-zone"]');
  await expect(poolZone).toBeVisible();

  const k = await kaart.boundingBox();
  const p = await poolZone.boundingBox();
  if (!k || !p) throw new Error("Kaart of pool-zone niet gevonden");

  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(k.x + k.width / 2 + 25, k.y + k.height / 2 + 25, { steps: 6 });
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2, { steps: 12 });
  await page.mouse.up();
  // Pointer-state schoonmaken na de dnd-kit-drop, daarna wachten tot de dialoog er echt staat.
  await page.mouse.move(5, 5);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("bevestigde klus naar de pool slepen vraagt eerst om bevestiging", async ({ page }) => {
  await page.goto("/planbord");
  const dialog = await sleepKaartNaarPool(page);

  // De dialoog verschijnt; er gebeurt nog niets in de database.
  await expect(dialog.getByText("Van de planning halen?")).toBeVisible();
  expect((await statusVan(seededId))?.dashboard_status).toBe("bevestigd");
});

test('"Nee" laat de klus op het bord staan', async ({ page }) => {
  await page.goto("/planbord");
  const dialog = await sleepKaartNaarPool(page);

  await dialog.getByRole("button", { name: "Nee" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Niks veranderd: nog bevestigd, nog toegewezen, kaart nog op het bord.
  const data = await statusVan(seededId);
  expect(data?.dashboard_status).toBe("bevestigd");
  expect(data?.toegewezen_aan).toBe(monteurId);
  await expect(page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`)).toBeVisible();
});

test('"Ja, van planning halen" ontplant de klus naar de pool', async ({ page }) => {
  await page.goto("/planbord");
  const dialog = await sleepKaartNaarPool(page);

  await dialog.getByRole("button", { name: "Ja, van planning halen" }).click();

  // Database: terug naar de pool, toewijzing gewist.
  await expect
    .poll(async () => (await statusVan(seededId))?.dashboard_status, { timeout: 12_000, intervals: [500] })
    .toBe("binnen");
  expect((await statusVan(seededId))?.toegewezen_aan).toBeNull();

  // Visueel: kaart weg van het bord, klant staat nu in de pool.
  await expect(page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`)).toHaveCount(0);
  await expect(page.locator('[data-testid="pool-zone"]').getByText(uniek)).toBeVisible();
});
