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
    // Order toevoegen kan via fotograferen (camera op de telefoon) of bestand kiezen.
    await expect(page.getByRole("button", { name: "Order fotograferen" })).toBeVisible();
    await page.getByLabel("Klantnaam").fill(naam);
    await page.getByLabel("Datum").fill("2026-06-20");
    await page.getByRole("button", { name: "Klus opslaan" }).click();

    // De klus staat daarna in de werkpool.
    await expect(page.getByText(naam)).toBeVisible({ timeout: 15_000 });
  } finally {
    await admin.from("meldingen").delete().eq("klant_naam", naam);
  }
});

/**
 * De monteur voegt een werk-omschrijving toe bij zelf-invoer ("kasten nastellen"), ziet die terug op de
 * detailpagina en past hem daar aan. Puur intern veld; controleert tonen + bewerken-tegenhanger.
 */
test("werk-omschrijving: invoeren, tonen op detail en bewerken", async ({ page }) => {
  const naam = `WERKOMS ${Date.now()}`;
  try {
    await page.goto("/");
    await wachtOpHydratie(page);

    await page.getByRole("button", { name: "Klus toevoegen" }).click();
    await page.getByLabel("Klantnaam").fill(naam);
    await page.getByPlaceholder("Bijv. kasten nastellen").fill("kasten nastellen");
    await page.getByRole("button", { name: "Klus opslaan" }).click();

    // Open de klus vanuit de werkpool. Gericht de kaart-link aanklikken (niet de succesmelding, die
    // ook de naam bevat); Playwright wacht tot de kaart na de refresh verschenen is.
    await page.locator('a[href^="/opdracht/"]', { hasText: naam }).click();
    await expect(page).toHaveURL(/\/opdracht\//);

    // De werk-omschrijving staat op de detailpagina.
    await expect(page.getByText("kasten nastellen")).toBeVisible({ timeout: 15_000 });

    // Bewerken: tekst aanpassen en opslaan.
    await page.getByRole("button", { name: "Bewerken" }).first().click();
    await page.getByPlaceholder("Bijv. kasten nastellen").fill("kasten nastellen en lade repareren");
    await page.getByRole("button", { name: "Opslaan" }).click();

    await expect(page.getByText("kasten nastellen en lade repareren")).toBeVisible({ timeout: 15_000 });
  } finally {
    await admin.from("meldingen").delete().eq("klant_naam", naam);
  }
});
