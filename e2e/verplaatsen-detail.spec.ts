import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Kantoor verplaatst een ingeplande opdracht via "Gegevens corrigeren" op de detailpagina: datum en
 * duur aanpassen zonder slepen op het bord. Op een NOG NIET verstuurde klus (concept_gepland), zodat de
 * reguliere run geen mail/SMS naar de monteur stuurt.
 */

test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
let id = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const r = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `VERPLAATS ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `VP${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  id = r.id;
  await db.planOpdracht(id, {
    toegewezen_aan: MONTEUR.uid,
    monteur_naam: "Rein RK TEST",
    startdatum: "2026-06-15",
    starttijd: null,
    duur_dagen: 1,
  });
});

test.afterEach(async () => {
  if (id) await admin.from("meldingen").delete().eq("id", id);
});

test("kantoor verplaatst datum en duur via het detailscherm", async ({ page }) => {
  await page.goto(`/dashboard/opdracht/${id}`);
  await page.getByRole("button", { name: "Gegevens corrigeren" }).click();

  // De planning-velden zijn zichtbaar omdat de opdracht is ingepland.
  await page.getByLabel("Startdatum").fill("2026-06-17");
  await page.getByLabel("Dagen").fill("2");
  await page.getByRole("button", { name: "Opslaan" }).click();

  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("meldingen")
          .select("startdatum, duur_dagen")
          .eq("id", id)
          .single();
        return `${data?.startdatum ?? ""}|${data?.duur_dagen ?? ""}`;
      },
      { timeout: 10_000, intervals: [400] },
    )
    .toBe("2026-06-17|2");
});
