import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Kantoor annuleert een opdracht via de dashboard-detailpagina. Op een NOG NIET verstuurde klus
 * (concept_gepland), zodat de reguliere run geen echte annuleer-mail naar de monteur stuurt; de
 * mailkant is gedekt door de route-unittest en de E2E_MAIL-flow in mail-flows.spec.
 */

test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
let id = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const r = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `ANNULEER ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `AN${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  id = r.id;
  // Wel ingepland, nog NIET verstuurd -> annuleren mailt niet.
  await db.planOpdracht(id, { toegewezen_aan: MONTEUR.uid, monteur_naam: "Rein RK TEST", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
});

test.afterEach(async () => {
  if (id) await admin.from("meldingen").delete().eq("id", id);
});

test("kantoor annuleert een opdracht via het dashboard", async ({ page }) => {
  await page.goto(`/dashboard/opdracht/${id}`);
  await page.getByRole("button", { name: "Opdracht annuleren" }).click();
  await page.getByRole("button", { name: "Ja, annuleren" }).click();

  await expect
    .poll(
      async () => {
        const { data } = await admin.from("meldingen").select("dashboard_status").eq("id", id).single();
        return data?.dashboard_status;
      },
      { timeout: 10_000, intervals: [400] },
    )
    .toBe("geannuleerd");

  await expect(page.getByText("Deze opdracht is geannuleerd")).toBeVisible();
});
