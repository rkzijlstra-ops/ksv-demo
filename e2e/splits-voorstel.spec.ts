import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Doormailen met mogelijk meerdere opdrachten: een binnengekomen voorstel met de splits-waarschuwing.
 * De monteur splitst het in losse klussen (één tik) of bevestigt als één. Plus: het inbound-adres staat
 * kopieerbaar in het klus-toevoegen-venster. Seedt als de testmonteur en ruimt op via een naam-merk.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false },
});
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

let merk = "";

test.afterEach(async () => {
  if (merk) await admin.from("meldingen").delete().like("klant_naam", `%${merk}%`);
  merk = "";
});

async function seedSplitsVoorstel() {
  merk = `SPLITS-${Date.now()}`;
  const { id } = await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: `${merk} samengevoegd`,
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    meldingen: [],
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    te_verwerken: true,
    controleer_splitsing: true,
    controleer_splitsing_reden: "De mail bevat 2 verschillende klanten (Jansen, De Vries).",
    splits_voorstel: [
      { velden: { documenttype: "onbekend", klant_naam: `${merk} Jansen` }, document_ids: [] },
      { velden: { documenttype: "onbekend", klant_naam: `${merk} De Vries` }, document_ids: [] },
    ],
  });
  return id;
}

test("het inbound-adres staat kopieerbaar in het klus-toevoegen-venster", async ({ page }) => {
  await page.goto("/");
  await wachtOpHydratie(page);
  await page.getByRole("button", { name: "Klus toevoegen" }).click();
  await expect(page.getByText("Of mail de opdracht door")).toBeVisible();
  await expect(page.getByText(/klus-.*@/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Kopieer" })).toBeVisible();
});

test("monteur splitst een voorstel in losse klussen", async ({ page }) => {
  const voorstelId = await seedSplitsVoorstel();

  await page.goto("/inbox");
  await wachtOpHydratie(page);
  await expect(page.getByText("Mogelijk meerdere opdrachten in deze mail")).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/inbound/${voorstelId}/splitsen`) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Splits in aparte klussen" }).click(),
  ]);

  // De twee delen staan nu als losse voorstellen in het bakje; het samengevoegde origineel is weg.
  await page.goto("/inbox");
  await wachtOpHydratie(page);
  await expect(page.getByText(`${merk} Jansen`)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`${merk} De Vries`)).toBeVisible();
  await expect(page.getByText(`${merk} samengevoegd`)).toHaveCount(0);
});

test("monteur bevestigt een splits-voorstel als één klus", async ({ page }) => {
  const voorstelId = await seedSplitsVoorstel();

  await page.goto("/inbox");
  await wachtOpHydratie(page);
  await expect(page.getByText("Mogelijk meerdere opdrachten in deze mail")).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/inbound/${voorstelId}/bevestigen`) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Het is er één" }).click(),
  ]);

  // Eén klus in de kluspool, geen waarschuwing meer.
  await page.goto("/");
  await expect(page.getByText(`${merk} samengevoegd`)).toBeVisible({ timeout: 15_000 });
});
