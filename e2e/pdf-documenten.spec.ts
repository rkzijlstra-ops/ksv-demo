import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Documenten-blok (gedeeld monteur/kantoor): soort-label + groepering, de in-app PDF-viewer (opent in
 * een overlay, GEEN nieuw tabblad) en de offline-knop (alleen monteur). We toetsen het gedrag/UI; de
 * eigenlijke PDF-rendering (pdfjs) is bibliotheek-terrein en keurt Rein visueel.
 */
const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

const ids: string[] = [];

async function seedKlusMetDocumenten(): Promise<{ id: string }> {
  const zaak = await db.getStandaardOpdrachtgever();
  const stamp = `${Date.now()}`;
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `PDFDOC ${stamp}`,
    klant_adres: "Teststraat 3",
    referentienummer: `PDFDOC${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  ids.push(id);
  const basis = "https://test.supabase.co/storage/v1/object/public/opdracht-documenten";
  const { error: insErr } = await admin.from("documenten").insert([
    {
      opdracht_id: id,
      type: "pdf",
      bestandsnaam: `Definitieve orderbon ${stamp}.pdf`,
      storage_pad: `x/orderbon-${stamp}.pdf`,
      publieke_url: `${basis}/orderbon-${stamp}.pdf`,
      referentienummer: `PDFDOC${stamp}`,
      is_primair: true,
      user_id: MONTEUR.uid,
    },
    {
      opdracht_id: id,
      type: "pdf",
      bestandsnaam: `Definitief Leidingschema ${stamp}.pdf`,
      storage_pad: `x/leiding-${stamp}.pdf`,
      publieke_url: `${basis}/leiding-${stamp}.pdf`,
      referentienummer: `PDFDOC${stamp}`,
      is_primair: false,
      user_id: MONTEUR.uid,
    },
  ]);
  if (insErr) throw new Error(`documenten insert mislukt: ${insErr.message}`);
  return { id };
}

test.afterEach(async () => {
  for (const id of ids) {
    await admin.from("documenten").delete().eq("opdracht_id", id);
    await admin.from("meldingen").delete().eq("id", id);
  }
  ids.length = 0;
});

test.describe("monteur: documenten-blok + in-app viewer + offline", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  test("toont soort-groepering, opent in de app (geen nieuw tabblad) en heeft een offline-knop", async ({ page }) => {
    const { id } = await seedKlusMetDocumenten();
    await page.goto(`/opdracht/${id}`);

    // Groepering + soort-labels.
    await expect(page.getByText("Tekeningen", { exact: true })).toBeVisible();
    await expect(page.getByText("Leidingschema", { exact: true })).toBeVisible();

    // Offline-knop is er voor de monteur.
    await expect(page.getByRole("button", { name: /Laad alles offline/i })).toBeVisible();

    // Openen gebeurt IN de app: een dialoog verschijnt, er opent geen nieuw tabblad.
    const aantalPaginas = page.context().pages().length;
    await page.getByRole("button", { name: /Leidingschema.*openen/i }).click();
    const dialoog = page.getByRole("dialog");
    await expect(dialoog).toBeVisible();
    expect(page.context().pages().length).toBe(aantalPaginas); // geen nieuw tabblad

    // Sluiten werkt.
    await dialoog.getByRole("button", { name: "Sluiten" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("kantoor: zelfde blok, geen offline-knop, wel verwijderen", () => {
  test.use({ storageState: "e2e/.auth/beheerder.json" });

  test("toont de documenten met soort, zonder offline-knop, met verwijder-actie", async ({ page }) => {
    const { id } = await seedKlusMetDocumenten();
    await page.goto(`/dashboard/opdracht/${id}`);

    await expect(page.getByText("Leidingschema", { exact: true })).toBeVisible();
    // Geen offline-knop op kantoor.
    await expect(page.getByRole("button", { name: /Laad alles offline/i })).toHaveCount(0);
    // Wel een verwijder-knop per document.
    await expect(page.getByRole("button", { name: /verwijderen/i }).first()).toBeVisible();
  });
});
