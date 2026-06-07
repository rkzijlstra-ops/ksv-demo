import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "./test-env";

/**
 * Geannuleerde opdrachten staan op het dashboard ingeklapt onder hun kopje, zodat ze de lijst niet
 * vullen. Het kopje uitklappen toont ze. Seedt een eigen geannuleerde opdracht en ruimt die op.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

let uniek = "";
let seededId = "";

test.beforeEach(async () => {
  uniek = `GEANN ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: uniek,
    klant_adres: "Teststraat 1",
    referentienummer: `GA${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  seededId = id;
  await db.annuleerOpdracht(seededId);
});

test.afterEach(async () => {
  if (seededId) await admin.from("meldingen").delete().eq("id", seededId);
});

test("geannuleerde opdracht staat ingeklapt en wordt zichtbaar na uitklappen", async ({ page }) => {
  await page.goto("/dashboard");

  // De inklapbare sectie-kop (heeft aria-expanded; de filterchip niet) staat dicht; kaart verborgen.
  const kop = page.getByRole("button", { name: /Geannuleerd/, expanded: false });
  await expect(kop).toBeVisible();
  await expect(page.getByText(uniek)).toHaveCount(0);

  // Uitklappen toont de geannuleerde opdracht.
  await kop.click();
  await expect(page.getByText(uniek)).toBeVisible();
});
