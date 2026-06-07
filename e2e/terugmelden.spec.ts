import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, MONTEUR } from "./test-env";

/**
 * Terugmelden (blok 9) + logboek (blok 8), cross-rol: de monteur meldt een door kantoor ingeschoten
 * klus terug, die verdwijnt uit zijn actieve werkpool en kantoor ziet hem met een markering plus het
 * logboek. Verifieert dat een Ed-klus nooit stil verdwijnt en de actie herleidbaar is.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

async function seedEdKlus(klant: string): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `TM${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid, // door KANTOOR ingeschoten
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  return id;
}

test.describe("monteur meldt een Ed-klus terug", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  let id = "";
  let klant = "";
  test.beforeEach(async () => {
    klant = `TERUGMELD ${Date.now()}`;
    id = await seedEdKlus(klant);
  });
  test.afterEach(async () => {
    if (id) {
      await admin.from("gebeurtenissen").delete().eq("opdracht_id", id);
      await admin.from("meldingen").delete().eq("id", id);
    }
  });

  test("een Ed-klus toont een terugmeld-knop en GEEN prullenbakje", async ({ page }) => {
    await page.goto("/");
    const kaart = page.locator(`a[href="/opdracht/${id}"]`);
    await expect(kaart).toBeVisible();
    await expect(kaart.getByRole("button", { name: "Terugmelden" })).toBeVisible();
    await expect(page.getByRole("button", { name: `Opdracht ${klant} verwijderen` })).toHaveCount(0);
  });

  test("terugmelden haalt de klus uit de actieve werkpool en logt de gebeurtenis", async ({ page }) => {
    const res = await page.request.post(`/api/opdrachten/${id}/terugmelden`, {
      data: { reden: "klant_niet_thuis", toelichting: "3x aangebeld" },
    });
    expect(res.ok()).toBeTruthy();

    // Database: teruggemeld + gelogd.
    const { data: m } = await admin.from("meldingen").select("teruggemeld_at, teruggemeld_reden").eq("id", id).single();
    expect(m?.teruggemeld_at).toBeTruthy();
    expect(m?.teruggemeld_reden).toBe("klant_niet_thuis");
    const { data: g } = await admin.from("gebeurtenissen").select("actie").eq("opdracht_id", id);
    expect((g ?? []).some((r) => r.actie === "teruggemeld")).toBe(true);

    // Werkpool: niet meer in de actieve lijst (zit in de ingeklapte geschiedenis).
    await page.goto("/");
    await expect(page.getByText("Werkpool")).toBeVisible();
    await expect(page.getByText(klant)).toHaveCount(0);
    await page.getByRole("button", { name: /Geschiedenis/ }).click();
    await expect(page.getByText(klant)).toBeVisible();
  });
});

test.describe("kantoor ziet de terugmelding en het logboek", () => {
  test.use({ storageState: "e2e/.auth/beheerder.json" });

  let id = "";
  let klant = "";
  test.beforeEach(async () => {
    klant = `TMKANTOOR ${Date.now()}`;
    id = await seedEdKlus(klant);
    await db.markeerTeruggemeld(id, { reden: "werk_niet_afgerond", toelichting: "onderdeel ontbrak" });
    await db.logGebeurtenis({
      opdracht_id: id, actie: "teruggemeld", door_id: MONTEUR.uid, door_naam: "E2E Monteur",
      door_rol: "monteur", details: { reden: "werk_niet_afgerond", toelichting: "onderdeel ontbrak" },
    });
  });
  test.afterEach(async () => {
    if (id) {
      await admin.from("gebeurtenissen").delete().eq("opdracht_id", id);
      await admin.from("meldingen").delete().eq("id", id);
    }
  });

  test("de opdracht-detailpagina toont de markering en het logboek met de reden", async ({ page }) => {
    await page.goto(`/dashboard/opdracht/${id}`);
    await expect(page.getByText("Logboek", { exact: false })).toBeVisible();
    await expect(page.getByText("Teruggemeld aan kantoor")).toBeVisible();
    await expect(page.getByText("Werk niet af te ronden")).toBeVisible();
  });
});
