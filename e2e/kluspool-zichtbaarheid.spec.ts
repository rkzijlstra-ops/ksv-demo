import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Cross-rol: wat de monteur in zijn kluspool ziet als kantoor iets met zijn klus doet. Dekt de drie
 * gaten uit TOESTANDEN.md. Draait onder de monteur-sessie (rk); de kantoor-acties gaan via de db-laag.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR.uid;

let ids: string[] = [];

async function seed(klant: string, toegewezen = true): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `WZ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: toegewezen ? RK : null,
    opdrachtgever_id: zaak?.id ?? null,
  });
  ids.push(id);
  return id;
}

test.beforeEach(() => {
  ids = [];
});

test.afterEach(async () => {
  for (const id of ids) await admin.from("meldingen").delete().eq("id", id);
});

test("gat 2: een geannuleerde klus staat niet meer in de kluspool van de monteur", async ({ page }) => {
  const klant = `GEANN-WP ${Date.now()}`;
  const id = await seed(klant);
  await db.planOpdracht(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-15", starttijd: null });
  await db.bevestigOntvangst(id);
  // Kantoor annuleert.
  await db.annuleerOpdracht(id);

  await page.goto("/");
  await expect(page.getByText("Kluspool")).toBeVisible();
  await expect(page.getByText(klant)).toHaveCount(0);
});

test("gat 3: een nog niet verstuurd concept is verborgen, een eigen klus blijft zichtbaar", async ({ page }) => {
  const conceptKlant = `CONCEPT-WP ${Date.now()}`;
  const eigenKlant = `EIGEN-WP ${Date.now()}`;
  const conceptId = await seed(conceptKlant, false);
  await db.planOpdracht(conceptId, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-16", starttijd: null, duur_dagen: 1 });
  await seed(eigenKlant); // status binnen, toegewezen aan RK (eigen werk)

  await page.goto("/");
  await expect(page.getByText("Kluspool")).toBeVisible();
  await expect(page.getByText(eigenKlant)).toBeVisible(); // eigen werk blijft
  await expect(page.getByText(conceptKlant)).toHaveCount(0); // kantoor-concept verborgen
});

test("gat 1: bij een wijziging na versturen houdt de monteur de afgesproken datum", async ({ page }) => {
  const klant = `WIJZIG-WP ${Date.now()}`;
  const afgesproken = "2026-06-10";
  const nieuw = "2026-06-24";
  const id = await seed(klant);
  await db.planOpdracht(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: afgesproken, starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: afgesproken, starttijd: null });
  await db.bevestigOntvangst(id);
  // Kantoor verplaatst de klus naar een nieuwe datum, nog NIET opnieuw verstuurd.
  await db.wijzigOpdracht(
    id,
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: nieuw, starttijd: null, duur_dagen: 1 },
    "bevestigd",
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: afgesproken, starttijd: null },
  );

  await page.goto(`/opdracht/${id}`);
  // De monteur ziet de afgesproken datum, niet de nog-niet-verstuurde wijziging.
  await expect(page.getByText(`Uitvoer: ${formatDatumKort(afgesproken)}`)).toBeVisible();
  await expect(page.getByText(formatDatumKort(nieuw))).toHaveCount(0);
});

test("gat 5: bij een monteur-wissel na versturen houdt de oorspronkelijke monteur de klus", async ({ page }) => {
  const klant = `WISSEL-WP ${Date.now()}`;
  const andereMonteur = "00000000-0000-4000-8000-000000000099";
  const id = await seed(klant);
  await db.planOpdracht(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-12", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-12", starttijd: null });
  await db.bevestigOntvangst(id);
  // Kantoor schuift de klus naar een andere monteur, nog NIET opnieuw verstuurd.
  await db.wijzigOpdracht(
    id,
    { toegewezen_aan: andereMonteur, monteur_naam: "Andere Monteur", startdatum: "2026-06-12", starttijd: null, duur_dagen: 1 },
    "bevestigd",
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-12", starttijd: null },
  );

  await page.goto("/");
  await expect(page.getByText("Kluspool")).toBeVisible();
  // RK (de verzonden monteur) blijft de klus zien tot kantoor opnieuw verstuurt.
  await expect(page.getByText(klant)).toBeVisible();
});
