import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * De monteur voegt zelf een klus toe via de gecombineerde flow op de kluspool: "Klus toevoegen" opent
 * het formulier, hij vult een naam en datum in (document is optioneel) en slaat op. De klus verschijnt
 * daarna in zijn kluspool. Ruimt de aangemaakte klus op via de service-rol.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

test("inschieten waarschuwt als het referentienummer al bestaat (mogelijke dubbele)", async ({ page }) => {
  const ref = `DUP${Date.now()}`;
  const naam = `DUP NIEUW ${Date.now()}`;
  await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: `Bestaand ${ref}`,
    klant_adres: null,
    referentienummer: ref,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: null,
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: null,
  });
  try {
    await page.goto("/");
    await wachtOpHydratie(page);
    await page.getByRole("button", { name: "Klus toevoegen" }).click();
    await page.getByLabel("Klantnaam").fill(naam);
    await page.getByLabel("Referentie").fill(ref);

    let dialogTekst = "";
    page.once("dialog", (d) => {
      dialogTekst = d.message();
      void d.dismiss(); // annuleren
    });
    await page.getByRole("button", { name: "Klus opslaan" }).click();
    await expect.poll(() => dialogTekst).toContain("bestaat al");

    // Geannuleerd: de nieuwe klus is NIET aangemaakt.
    await page.waitForTimeout(500);
    const { count } = await admin
      .from("meldingen")
      .select("id", { count: "exact", head: true })
      .eq("klant_naam", naam);
    expect(count ?? 0).toBe(0);
  } finally {
    await admin.from("meldingen").delete().eq("referentienummer", ref);
    await admin.from("meldingen").delete().eq("klant_naam", naam);
  }
});

test("monteur voegt zelf een klus toe met datum, die in de kluspool verschijnt", async ({ page }) => {
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

    // De klus staat daarna in de kluspool.
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

    // Open de klus vanuit de kluspool. Gericht de kaart-link aanklikken (niet de succesmelding, die
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
