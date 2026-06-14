import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Kantoor (beheerder) maakt handmatig een klus aan op het dashboard via het gedeelde KlusInvoer-component
 * ("Nieuwe klus"). De klus krijgt server-zijdig een zaak (opdrachtgever_id) en verschijnt in de
 * dashboard-lijst (= "te plannen"), zonder externe PDF. Ruimt de aangemaakte klus op via de service-rol.
 */
test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false },
});

test("kantoor voegt handmatig een klus toe op het dashboard, die in de lijst verschijnt", async ({
  page,
}) => {
  const naam = `KANTOOR ${Date.now()}`;
  try {
    await page.goto("/dashboard");
    await wachtOpHydratie(page);

    await page.getByRole("button", { name: "Nieuwe klus" }).click();
    await page.getByLabel("Klantnaam").fill(naam);
    await page.getByLabel("Adres").fill("Dorpsstraat 14, Noordwijkerhout");
    await page.getByPlaceholder("Bijv. kasten nastellen").fill("lade onder de oven nastellen");
    await page.getByRole("button", { name: "Klus opslaan" }).click();

    // De klus staat daarna als kaart in de dashboard-lijst (niet alleen de succesmelding).
    await expect(
      page.locator('a[href^="/dashboard/opdracht/"]', { hasText: naam }),
    ).toBeVisible({ timeout: 15_000 });
  } finally {
    await admin.from("meldingen").delete().eq("klant_naam", naam);
  }
});
