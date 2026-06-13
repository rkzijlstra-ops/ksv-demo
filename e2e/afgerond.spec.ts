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
  await expect(page.getByRole("heading", { name: "Hoe rond je af?" })).toBeVisible();
  await page.getByRole("link", { name: /klaar, snel/i }).click();
  await page.waitForURL((u) => new URL(u).pathname.endsWith("/afronden/snel"));
  await page.getByRole("textbox").fill("Alles getest, klant tevreden.");
  await page.getByRole("button", { name: /afgerond melden/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin.from("meldingen").select("afgerond_door_monteur_at").eq("id", opdrachtId).single();
  expect(data?.afgerond_door_monteur_at).not.toBeNull();
});
