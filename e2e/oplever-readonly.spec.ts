import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * Een al verstuurd rapport opnieuw openen:
 * - opdrachtgever-klus = read-only (bekijken, geen invoer/verstuurknoppen).
 * - eigen klus = bewerken mag, maar met een waarschuwing bij het openen.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;
const klusIds: string[] = [];

async function maakKlus(prefix: string, opts: { eigen?: boolean } = {}): Promise<string> {
  const zaak = opts.eigen ? null : await db.getStandaardOpdrachtgever();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `${prefix} ${stamp}`,
    klant_adres: "Teststraat 1",
    referentienummer: `RO${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: opts.eigen ? null : "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  klusIds.push(id);
  return id;
}

async function seedMelding(opdrachtId: string, video_url: string | null = null): Promise<void> {
  await db.createMonteurMelding({
    opdracht_id: opdrachtId,
    spoed: false,
    ruwe_tekst: "Lade nastellen",
    spraak_tekst: null,
    foto_urls: [],
    video_url,
    user_id: RK,
  });
}

async function seedVerzending(opdrachtId: string): Promise<void> {
  await db.logRapportVerzending({
    opdracht_id: opdrachtId,
    doelgroep: "zaak",
    naar: "opdrachtgever@kluslus.test",
    rapport_url: "https://test.supabase.co/storage/v1/object/public/oplever/rapport-readonly-test.pdf",
    door_id: RK,
  });
}

test.afterEach(async () => {
  for (const id of klusIds.splice(0)) {
    await admin.from("rapport_verzendingen").delete().eq("opdracht_id", id);
    await admin.from("opleveringen").delete().eq("opdracht_id", id);
    await admin.from("meldingen").delete().eq("opdracht_id", id);
    await admin.from("meldingen").delete().eq("id", id);
  }
});

test("opdrachtgever-klus met verstuurd rapport: read-only, geen verstuurknoppen, wel het rapport", async ({ page }) => {
  const id = await maakKlus("RO-OG");
  await seedMelding(id, "https://example.com/video-melding.mp4");
  await seedVerzending(id);

  await page.goto(`/opdracht/${id}/opleveren`);
  await expect(page.getByText(/alleen-lezen/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Rapport-PDF openen/i })).toBeVisible();
  // Geen verstuur-keuzes (de flow wordt niet getoond).
  await expect(page.getByRole("button", { name: "Naar de opdrachtgever" })).toHaveCount(0);

  // De afsluit-hub toont 'Rapport bekijken', niet de snel/volledig-keuzes.
  await page.goto(`/opdracht/${id}/afronden`);
  await expect(page.getByText("Rapport bekijken")).toBeVisible();
  await expect(page.getByText("Snel afsluiten")).toHaveCount(0);
});

test("opgeleverde klus blijft bereikbaar op de monteur-detailpagina (geen 404 na versturen)", async ({ page }) => {
  const id = await maakKlus("RO-DETAIL");
  await seedMelding(id);
  await db.upsertOpleveringConcept({
    opdracht_id: id,
    eindstaat_foto_urls: [],
    video_url: null,
    opmerking: "Opgeleverd via snel afsluiten.",
    user_id: RK,
  });
  await db.registreerZaakRapport(id, "https://test.supabase.co/storage/v1/object/public/oplever/r.pdf");

  await page.goto(`/opdracht/${id}`);
  // De detailpagina moet laden (geen 404): de "Opgeleverd"-staat is zichtbaar.
  await expect(page.getByText("Opgeleverd op")).toBeVisible();
});

test("eigen klus met verstuurd rapport: waarschuwing bij openen, Ga door maakt bewerkbaar", async ({ page }) => {
  const id = await maakKlus("RO-EIGEN", { eigen: true });
  await seedMelding(id);
  await seedVerzending(id);

  await page.goto(`/opdracht/${id}/opleveren`);
  const dialog = page.getByRole("dialog", { name: "Bestaand rapport aanpassen" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Ga door" }).click();
  await expect(dialog).toHaveCount(0);
  // De flow is nu bewerkbaar: de verstuur-keuze is zichtbaar.
  await expect(page.getByRole("button", { name: "Naar de opdrachtgever" })).toBeVisible();
});
