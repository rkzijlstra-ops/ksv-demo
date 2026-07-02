import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Adres-keuze (blok 20) op de MONTEUR-kant. Een klus die met meerdere adressen binnenkwam (per mail
 * of via zijn eigen upload) is gevlagd (adres_keuze_nodig) en heeft nog geen klant_adres. Ook op de
 * monteur-detailpagina (/opdracht/[id]) moet hij bewust de montagelocatie kunnen kiezen, anders staat
 * de klus zonder adres in zijn kluspool en kan hij niet naar de juiste locatie navigeren.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
let id = "";

const MONTAGE = "Marshalllaan 2, 2215 NZ Voorhout";
const BEDRIJF = "Ambachtsweg 7, 2222 AH Katwijk";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const r = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `ADRESKEUZE MONTEUR ${Date.now()}`,
    klant_adres: null, // bewust leeg: er moet eerst gekozen worden
    referentienummer: `AKM${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid, // de klus is van de monteur
    opdrachtgever_id: zaak?.id ?? null,
    adres_kandidaten: [
      { adres: MONTAGE, soort: "montage" },
      { adres: BEDRIJF, soort: "opdrachtgever" },
    ],
    adres_keuze_nodig: true,
  });
  id = r.id;
});

test.afterEach(async () => {
  if (id) await admin.from("meldingen").delete().eq("id", id);
});

test("monteur kiest de montagelocatie bij meerdere adressen op zijn eigen klus", async ({ page }) => {
  await page.goto(`/opdracht/${id}`);

  // Het gedeelde keuze-blok (AdresKeuze) staat er en beide adressen worden aangeboden.
  await expect(page.getByText("kies de montagelocatie")).toBeVisible();
  await expect(page.getByText(MONTAGE)).toBeVisible();
  await expect(page.getByText(BEDRIJF)).toBeVisible();

  // Kies bewust de montagelocatie en bevestig.
  await page.getByRole("radio", { name: new RegExp("Marshalllaan 2") }).check();
  await page.getByRole("button", { name: "Adres bevestigen" }).click();

  // De DB heeft nu het gekozen adres en de vlag is weg.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("meldingen")
          .select("klant_adres, adres_keuze_nodig")
          .eq("id", id)
          .single();
        return data;
      },
      { timeout: 10_000, intervals: [400] },
    )
    .toMatchObject({ klant_adres: MONTAGE, adres_keuze_nodig: false });

  // En het keuze-blok is na de refresh verdwenen, met het adres nu in de gegevens.
  await expect(page.getByRole("button", { name: "Adres bevestigen" })).toBeHidden();
});
