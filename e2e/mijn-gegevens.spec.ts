import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Afzender-gegevens (blok 10), cross-feature: de monteur vult zijn bedrijfsnaam/telefoon/mail in via
 * "Mijn gegevens", en die komen op zijn opleverrapport (niet meer hardcoded BKM).
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

test.describe("monteur beheert zijn afzender-gegevens", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  let opdrachtId = "";
  test.afterEach(async () => {
    // Profiel terugzetten (incl. naam) en de geseede klus opruimen, zodat andere tests schoon starten.
    await admin
      .from("profielen")
      .update({ naam: "E2E Monteur", bedrijfsnaam: null, telefoon: null, contact_email: null })
      .eq("id", MONTEUR.uid);
    if (opdrachtId) {
      await admin.from("opleveringen").delete().eq("opdracht_id", opdrachtId);
      await admin.from("meldingen").delete().eq("id", opdrachtId);
    }
  });

  test("ingevulde gegevens worden opgeslagen en verschijnen op het rapport", async ({ page }) => {
    await page.goto("/mijn-gegevens");
    await page.getByPlaceholder("Bijv. Piet de Vries").fill("Rein de Vries");
    await page.getByLabel("Bedrijfsnaam").fill("Testmontage VOF");
    await page.getByLabel("Telefoon").fill("06-99887766");
    await page.getByLabel("Contact-e-mail").fill("test@montage.nl");
    await page.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByText("Opgeslagen")).toBeVisible();

    const { data: prof } = await admin
      .from("profielen")
      .select("naam, bedrijfsnaam, telefoon, contact_email")
      .eq("id", MONTEUR.uid)
      .single();
    expect(prof?.naam).toBe("Rein de Vries");
    expect(prof?.bedrijfsnaam).toBe("Testmontage VOF");
    expect(prof?.telefoon).toBe("06-99887766");

    // Opgeleverde klus met oplevering door deze monteur -> rapport pakt zijn afzender.
    const zaak = await db.getStandaardOpdrachtgever();
    const res = await db.createOpdracht({
      documenttype: "werkbon_service",
      klant_naam: `AFZENDER ${Date.now()}`,
      klant_adres: "Teststraat 2",
      referentienummer: `AFZ${Date.now()}`,
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      keukenzaak: "Keukenstudio Voorschoten",
      user_id: MONTEUR.uid,
      toegewezen_aan: MONTEUR.uid,
      opdrachtgever_id: zaak?.id ?? null,
    });
    opdrachtId = res.id;
    await db.upsertOpleveringConcept({
      opdracht_id: opdrachtId,
      eindstaat_foto_urls: [],
      video_url: null,
      opmerking: "Netjes opgeleverd.",
      rapport_email: null,
      user_id: MONTEUR.uid,
      handtekening_url: null,
    });
    await db.markeerOpgeleverd(opdrachtId, "https://storage.example/afz.pdf");

    await page.goto(`/opdracht/${opdrachtId}/rapport`);
    await expect(page.getByText("Testmontage VOF")).toBeVisible();
    await expect(page.getByText("BKM", { exact: true })).toHaveCount(0);
  });
});
