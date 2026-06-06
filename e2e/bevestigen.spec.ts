import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * De monteur bevestigt de ontvangst van een verstuurde klus (uit de opdracht-mail). Seedt een
 * geplande+verstuurde klus op rk, opent de detailpagina als rk, klikt "Ontvangst bevestigen" en
 * controleert dat de status in de database op 'bevestigd' staat.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR.uid;
let id = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const r = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `BEVESTIG ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `BV${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  id = r.id;
  await db.planOpdracht(id, { toegewezen_aan: RK, monteur_naam: "Rein RK TEST", startdatum: "2026-06-15", starttijd: null, duur_dagen: 1 });
  await db.markeerVerzonden(id, { toegewezen_aan: RK, monteur_naam: "Rein RK TEST", startdatum: "2026-06-15", starttijd: null });
});

test.afterEach(async () => {
  if (id) await admin.from("meldingen").delete().eq("id", id);
});

test("monteur bevestigt de ontvangst van zijn klus", async ({ page }) => {
  await page.goto(`/opdracht/${id}`);
  await page.getByRole("button", { name: "Ontvangst bevestigen" }).click();

  // Database: status op 'bevestigd'.
  await expect
    .poll(
      async () => {
        const { data } = await admin.from("meldingen").select("dashboard_status").eq("id", id).single();
        return data?.dashboard_status;
      },
      { timeout: 10_000, intervals: [400] },
    )
    .toBe("bevestigd");

  // UI toont de bevestiging.
  await expect(page.getByText("Ontvangst bevestigd")).toBeVisible();
});
