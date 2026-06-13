import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Documentbeheer op de opdracht-detailpagina (kantoor): een document bijvoegen en weer verwijderen,
 * via de echte routes en storage. Seedt een eigen opdracht en ruimt opdracht + documenten op.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `DOC ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `D${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (!opdrachtId) return;
  await admin.from("documenten").delete().eq("opdracht_id", opdrachtId);
  await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("kantoor voegt een document bij en verwijdert het weer", async ({ page }) => {
  await page.goto(`/dashboard/opdracht/${opdrachtId}`);
  await wachtOpHydratie(page); // pas na hydratie is de change-handler van de file-input gekoppeld

  const naam = `bijlage-${Date.now()}.pdf`;
  await page.locator('input[type="file"]').setInputFiles({
    name: naam,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%bijlage\n%%EOF"),
  });

  // Het document verschijnt in de lijst.
  await expect(page.getByText(naam)).toBeVisible({ timeout: 15_000 });

  // Verwijderen, met bevestiging.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Document ${naam} verwijderen` }).click();

  // Het document is weg uit de lijst.
  await expect(page.getByText(naam)).toHaveCount(0, { timeout: 15_000 });
});
