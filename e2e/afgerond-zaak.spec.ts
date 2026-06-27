import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * Zaak-kant van "klus voltooien": de zaak ziet een door de monteur voltooid gemelde klus op de
 * detailpagina en velt het eindoordeel (Akkoord klaar / Toch nog open). Draait onder de beheerder.
 */
test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
let opdrachtId = "";

async function seedVoltooid(): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `ZAAK ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR_ACC.uid,
    toegewezen_aan: MONTEUR_ACC.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  const nu = new Date().toISOString();
  await admin
    .from("meldingen")
    .update({
      afgerond_door_monteur_at: nu,
      afgerond_toelichting: "Alles getest, klant tevreden.",
      // Opgeleverd: de verwerk-status (Te verwerken / Verwerkt) triggert op status 'opgeleverd'.
      opdracht_status: "opgeleverd",
      dashboard_status: "opgeleverd",
      opgeleverd_at: nu,
    })
    .eq("id", id);
  return id;
}

test.afterEach(async () => {
  if (opdrachtId) await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("zaak markeert een opgeleverde klus als verwerkt", async ({ page }) => {
  opdrachtId = await seedVoltooid();
  await page.goto(`/dashboard/opdracht/${opdrachtId}`);
  await expect(page.getByRole("heading", { name: "Te verwerken" })).toBeVisible();
  await page.getByRole("button", { name: /markeer als verwerkt/i }).click();
  await expect
    .poll(async () => {
      const { data } = await admin.from("meldingen").select("afgerond_akkoord_at").eq("id", opdrachtId).single();
      return data?.afgerond_akkoord_at;
    })
    .not.toBeNull();
});

test("zaak heropent een opgeleverde klus naar te plannen", async ({ page }) => {
  opdrachtId = await seedVoltooid();
  await page.goto(`/dashboard/opdracht/${opdrachtId}`);
  await page.getByRole("button", { name: "Heropenen" }).click(); // trigger
  await page.getByRole("dialog", { name: "Klus heropenen" }).getByRole("button", { name: "Heropenen" }).click();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("meldingen")
        .select("afgerond_door_monteur_at, dashboard_status")
        .eq("id", opdrachtId)
        .single();
      return data?.afgerond_door_monteur_at;
    })
    .toBeNull();
});
