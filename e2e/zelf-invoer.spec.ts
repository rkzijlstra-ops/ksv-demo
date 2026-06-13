import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * De monteur voegt zelf een klus toe via de gecombineerde flow op de werkpool: "Klus toevoegen" opent
 * het formulier, hij vult een naam en datum in (document is optioneel) en slaat op. De klus verschijnt
 * daarna in zijn werkpool. Ruimt de aangemaakte klus op via de service-rol.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });

test("monteur voegt zelf een klus toe met datum, die in de werkpool verschijnt", async ({ page }) => {
  const naam = `ZELF ${Date.now()}`;
  try {
    await page.goto("/");
    await wachtOpHydratie(page);

    await page.getByRole("button", { name: "Klus toevoegen" }).click();
    await page.getByLabel("Klantnaam").fill(naam);
    await page.getByLabel("Datum").fill("2026-06-20");
    await page.getByRole("button", { name: "Klus opslaan" }).click();

    // De klus staat daarna in de werkpool.
    await expect(page.getByText(naam)).toBeVisible({ timeout: 15_000 });
  } finally {
    await admin.from("meldingen").delete().eq("klant_naam", naam);
  }
});
