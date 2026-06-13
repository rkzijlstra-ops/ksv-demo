import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Het inbound "te verwerken"-bakje: een per mail binnengekomen voorstel (te_verwerken) staat niet in
 * de werkpool maar in het bakje. De monteur bevestigt het, waarna het een gewone klus in de werkpool
 * wordt. Seedt een voorstel als de testmonteur en ruimt het op.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

let voorstelId = "";

test.afterEach(async () => {
  if (voorstelId) await admin.from("meldingen").delete().eq("id", voorstelId);
});

test("monteur bevestigt een inbound-voorstel, dat naar de werkpool verhuist", async ({ page }) => {
  const naam = `INBOUND ${Date.now()}`;
  const { id } = await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: naam,
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    meldingen: [],
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    te_verwerken: true,
  });
  voorstelId = id;

  // Werkpool: het voorstel staat er NIET in, maar de banner wijst naar het bakje.
  await page.goto("/");
  await wachtOpHydratie(page);
  await expect(page.getByText("te verwerken uit je mail")).toBeVisible();
  await expect(page.getByText(naam)).toHaveCount(0);

  // In het bakje bevestigen.
  await page.goto("/inbox");
  await wachtOpHydratie(page);
  await expect(page.getByText(naam)).toBeVisible();
  await page.getByRole("button", { name: "Bevestigen" }).click();

  // Daarna staat het als gewone klus in de werkpool.
  await page.goto("/");
  await expect(page.getByText(naam)).toBeVisible({ timeout: 15_000 });
});
