import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET } from "./test-env";

/**
 * De beheerder zet per opdrachtgever de klant-levering aan/uit op de beheer-pagina. We gebruiken een
 * EIGEN tijdelijke opdrachtgever (niet de standaard-zaak), zodat parallelle specs die de standaard-zaak
 * gebruiken niet geraakt worden door het togglen.
 */
test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });

let zaakId = "";
let zaakNaam = "";

test.beforeEach(async () => {
  zaakNaam = `E2E-ZAAK-${Date.now()}`;
  const { data, error } = await admin
    .from("opdrachtgevers")
    .insert({ naam: zaakNaam })
    .select("id, klant_levering_toegestaan")
    .single();
  if (error) throw new Error(error.message);
  zaakId = data!.id;
  // Nieuwe opdrachtgever staat standaard op klant-levering AAN.
  expect(data!.klant_levering_toegestaan).toBe(true);
});

test.afterEach(async () => {
  if (zaakId) await admin.from("opdrachtgevers").delete().eq("id", zaakId);
});

test("beheerder zet klant-levering voor een opdrachtgever uit en weer aan", async ({ page }) => {
  await page.goto("/gebruikers");
  await expect(page.getByRole("heading", { name: /Opdrachtgevers/ })).toBeVisible();

  const knop = page.getByRole("button", {
    name: new RegExp(`klant-levering voor ${zaakNaam}`, "i"),
  });
  await expect(knop).toBeVisible();
  await expect(knop).toHaveText("Aan");

  // Uitzetten -> knop toont "Uit" en de db volgt.
  await knop.click();
  await expect(knop).toHaveText("Uit");
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("opdrachtgevers")
        .select("klant_levering_toegestaan")
        .eq("id", zaakId)
        .single();
      return data?.klant_levering_toegestaan;
    })
    .toBe(false);

  // Weer aanzetten.
  await knop.click();
  await expect(knop).toHaveText("Aan");
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("opdrachtgevers")
        .select("klant_levering_toegestaan")
        .eq("id", zaakId)
        .single();
      return data?.klant_levering_toegestaan;
    })
    .toBe(true);
});
