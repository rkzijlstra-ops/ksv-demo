import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Cross-rol UI-keten voor VERZET (zelfde monteur, nieuwe datum, opnieuw verstuurd) en WISSEL (andere
 * monteur, opnieuw verstuurd). De mail/SMS-toon is al unit-gedekt (monteur-mail.test, sms-teksten.test);
 * hier toetsen we wat de MONTEUR in de app ziet nadat kantoor opnieuw heeft verstuurd. De kantoor-acties
 * gaan via de db-laag (opnieuw versturen mailt anders echt in de gewone CI-run).
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR.uid;
const ANDERE = "00000000-0000-4000-8000-000000000099";

let id = "";

async function seedVerstuurdBevestigd(klant: string, datum: string): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const r = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `VW${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  await db.planOpdracht(r.id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: datum, starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(r.id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: datum, starttijd: null });
  await db.bevestigOntvangst(r.id);
  return r.id;
}

test.afterEach(async () => {
  if (id) await admin.from("meldingen").delete().eq("id", id);
  id = "";
});

test("verzet: na opnieuw versturen ziet de monteur de NIEUWE datum en moet hij herbevestigen", async ({ page }) => {
  const klant = `VERZET ${Date.now()}`;
  const oud = "2026-06-10";
  const nieuw = "2026-06-24";
  id = await seedVerstuurdBevestigd(klant, oud);

  // Kantoor verzet de datum en verstuurt opnieuw (zelfde monteur).
  await db.wijzigOpdracht(
    id,
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: nieuw, starttijd: null, duur_dagen: 1 },
    "bevestigd",
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: oud, starttijd: null },
  );
  await db.markeerVerzonden(id, { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: nieuw, starttijd: null });

  // Database: terug op 'gepland' (opnieuw te bevestigen).
  const { data } = await admin.from("meldingen").select("dashboard_status").eq("id", id).single();
  expect(data?.dashboard_status).toBe("gepland");

  // Monteur-UI: de nieuwe datum staat er, de oude niet meer.
  await page.goto(`/opdracht/${id}`);
  await expect(page.getByText(`Uitvoer: ${formatDatumKort(nieuw)}`)).toBeVisible();
  await expect(page.getByText(`Uitvoer: ${formatDatumKort(oud)}`)).toHaveCount(0);

  // En in de werkpool staat hij weer op "Te bevestigen".
  await page.goto("/");
  const kaart = page.locator(`a[href="/opdracht/${id}"]`);
  await expect(kaart).toBeVisible();
  await expect(kaart.getByText("Te bevestigen")).toBeVisible();
});

test("wissel: na opnieuw versturen naar een andere monteur verdwijnt de klus uit de werkpool van de eerste", async ({ page }) => {
  const klant = `WISSEL ${Date.now()}`;
  id = await seedVerstuurdBevestigd(klant, "2026-06-12");

  // Vóór de herzending ziet RK de klus nog (gedekt in werkpool-zichtbaarheid gat 5). Nu de wissel + herzending:
  await db.wijzigOpdracht(
    id,
    { toegewezen_aan: ANDERE, monteur_naam: "Andere Monteur", startdatum: "2026-06-12", starttijd: null, duur_dagen: 1 },
    "bevestigd",
    { toegewezen_aan: RK, monteur_naam: "Rein RK", startdatum: "2026-06-12", starttijd: null },
  );
  await db.markeerVerzonden(id, { toegewezen_aan: ANDERE, monteur_naam: "Andere Monteur", startdatum: "2026-06-12", starttijd: null });

  // Database: de klus is nu van de andere monteur.
  const { data } = await admin.from("meldingen").select("toegewezen_aan").eq("id", id).single();
  expect(data?.toegewezen_aan).toBe(ANDERE);

  // Monteur-UI (RK): de klus is uit zijn werkpool verdwenen.
  await page.goto("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
  await expect(page.getByText(klant)).toHaveCount(0);
});
