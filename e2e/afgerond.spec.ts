import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * De monteur kan een toegewezen klus afgerond melden via het keuzescherm. Daarna staat
 * afgerond_door_monteur_at gevuld in de database.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;
let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `AFROND ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (opdrachtId) await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("monteur meldt een klus afgerond via het keuzescherm", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden`);
  await expect(page.getByRole("heading", { name: "Op welke manier sluit je af?" })).toBeVisible();
  await page.getByRole("link", { name: /snel afsluiten/i }).click();
  await page.waitForURL((u) => new URL(u).pathname.endsWith("/afronden/snel"));
  await page.getByRole("textbox").fill("Alles getest, klant tevreden.");
  await page.getByRole("button", { name: /klus afsluiten/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin.from("meldingen").select("afgerond_door_monteur_at").eq("id", opdrachtId).single();
  expect(data?.afgerond_door_monteur_at).not.toBeNull();
});

test("monteur meldt een klus niet doorgegaan via het keuzescherm", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden`);
  await page.getByRole("button", { name: /niet doorgegaan/i }).click();
  await page.getByRole("textbox").fill("Meerdere keren aangebeld, niemand thuis.");
  await page.getByRole("button", { name: "Terugmelden" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin.from("meldingen").select("teruggemeld_at").eq("id", opdrachtId).single();
  expect(data?.teruggemeld_at).not.toBeNull();
});

test("voltooid met vervolg-vinkje zet de klus terug naar te plannen", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden/snel`);
  await page.getByRole("checkbox").check();
  await page.getByRole("textbox").fill("Onderdelen komen later, vervolg nodig.");
  await page.getByRole("button", { name: /klus afsluiten/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin
    .from("meldingen")
    .select("afgerond_vervolg_nodig, dashboard_status, toegewezen_aan")
    .eq("id", opdrachtId)
    .single();
  expect(data?.afgerond_vervolg_nodig).toBe(true);
  expect(data?.dashboard_status).toBe("binnen");
  expect(data?.toegewezen_aan).toBeNull();
});

test("voltooid met vervolg op een ad-hoc klus (geen kantoor) blijft bij de monteur", async ({ page }) => {
  // Zelf-aangemaakte klus zonder opdrachtgever: er is geen kantoor om het op te pakken.
  const { id: adhocId } = await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: `ADHOC ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `A${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: null,
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: null,
  });
  try {
    await page.goto(`/opdracht/${adhocId}/afronden/snel`);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /klus afsluiten/i }).click();
    await page.waitForURL((u) => new URL(u).pathname === "/");

    const { data } = await admin
      .from("meldingen")
      .select("afgerond_vervolg_nodig, toegewezen_aan")
      .eq("id", adhocId)
      .single();
    expect(data?.afgerond_vervolg_nodig).toBe(true);
    expect(data?.toegewezen_aan).toBe(RK); // bleef bij de monteur, niet weg-geontplanned
  } finally {
    await admin.from("meldingen").delete().eq("id", adhocId);
  }
});
