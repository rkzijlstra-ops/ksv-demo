import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Multi-opdrachtgever: een monteur mag documenten toevoegen aan een klus die hij ZELF heeft
 * aangemaakt (user_id = de monteur). Eerder blokkeerde de API elke monteur ("alleen kantoor").
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;
let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: `EIGEN ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `DOC${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: null,
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (opdrachtId) {
    await admin.from("documenten").delete().eq("opdracht_id", opdrachtId);
    await admin.from("meldingen").delete().eq("id", opdrachtId);
  }
});

test("monteur voegt een document toe aan zijn eigen klus", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}`);
  await wachtOpHydratie(page); // pas na hydratie is de change-handler van de file-input gekoppeld

  const naam = `gegevens-${Date.now()}.pdf`;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: naam,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%bijlage\n%%EOF"),
  });

  // Geen rode rechten-melding; het document verschijnt in de lijst.
  await expect(page.getByText("Alleen kantoor", { exact: false })).toHaveCount(0);
  await expect(page.getByText(naam)).toBeVisible({ timeout: 15_000 });
});
