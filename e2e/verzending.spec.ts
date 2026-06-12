import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";

/**
 * Ontkoppelde verzending (klant los van zaak) en de privacy-afscherming, getest tegen de TEST-DB
 * zonder echt te mailen. De mailstap zelf (Resend) zit in mail.spec achter E2E_MAIL; hier toetsen we
 * de twee dingen die los van de mail staan en die in de database/UI moeten kloppen:
 *
 *  1. Status-koppeling (data-laag): klant-versturen registreert de klant-velden en laat de
 *     opdracht-status met rust; zaak-versturen zet de opdracht PAS dan op 'opgeleverd'. We roepen
 *     dezelfde db-functies aan die de route (`/api/opdrachten/[id]/rapport`) na een geslaagde mail
 *     aanroept, en lezen het resultaat terug met de service-role.
 *  2. Privacy (app-laag): het kantoor/de opdrachtgever (Ed) ziet het oplever-blok, inclusief de
 *     interne notitie, PAS nadat de zaak-versie is verstuurd (gate op `zaak_rapport_verzonden_at` in
 *     dashboard/opdracht/[id]/page.tsx). We simuleren de zaak-verzending via dezelfde db-functie.
 *
 * De interne notitie die niet naar de klant-PDF mag lekken, is apart unit-gedekt in rapport.test.ts.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

const createdIds: string[] = [];

/** Maakt een opdracht (eigen zaak) met een concept-oplevering en geeft id + klantnaam terug. */
async function seedOplevering(
  opts: { interne_opmerking?: string | null; opmerking?: string | null } = {},
): Promise<{ id: string; klantNaam: string }> {
  const zaak = await db.getStandaardOpdrachtgever();
  const stamp = `${Date.now()}`;
  const klantNaam = `VERZEND ${stamp}`;
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klantNaam,
    klant_adres: "Teststraat 1",
    referentienummer: `VZ${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  await db.upsertOpleveringConcept({
    opdracht_id: id,
    // Host moet matchen met next.config images.remotePatterns (*.supabase.co), anders gooit
    // next/image een fout zodra het oplever-blok (FotoGalerij) op de dashboard-pagina rendert.
    eindstaat_foto_urls: [`https://test.supabase.co/storage/v1/object/public/oplever/foto-${id}.png`],
    video_url: null,
    opmerking: opts.opmerking ?? null,
    interne_opmerking: opts.interne_opmerking ?? null,
    handtekening_url: `https://x/htk-${id}.png`,
    rapport_email: null,
    user_id: MONTEUR.uid,
  });
  createdIds.push(id);
  return { id, klantNaam };
}

test.afterEach(async () => {
  for (const id of createdIds) {
    await admin.from("opleveringen").delete().eq("opdracht_id", id);
    await admin.from("meldingen").delete().eq("id", id);
  }
  createdIds.length = 0;
});

test.describe("status-koppeling: klant los van zaak (data-laag)", () => {
  test("klant-versturen registreert de klant-velden en laat de opdracht-status met rust", async () => {
    const { id } = await seedOplevering();
    const url = `https://x/opdracht-documenten/${id}-klant.pdf`;

    await db.registreerKlantRapport(id, url, "klant@voorbeeld.test");

    const { data: opl } = await admin
      .from("opleveringen")
      .select("klant_rapport_email, klant_rapport_url, klant_rapport_verzonden_at, zaak_rapport_verzonden_at")
      .eq("opdracht_id", id)
      .single();
    expect(opl?.klant_rapport_email).toBe("klant@voorbeeld.test");
    expect(opl?.klant_rapport_url).toBe(url);
    expect(opl?.klant_rapport_verzonden_at).toBeTruthy();
    // De zaak heeft zijn versie nog NIET gehad.
    expect(opl?.zaak_rapport_verzonden_at).toBeNull();

    // En cruciaal: de opdracht is hierdoor NIET opgeleverd geraakt.
    const { data: m } = await admin.from("meldingen").select("opdracht_status").eq("id", id).single();
    expect(m?.opdracht_status).not.toBe("opgeleverd");
  });

  test("zaak-versturen zet de opdracht op opgeleverd en registreert de zaak-velden", async () => {
    const { id } = await seedOplevering();
    const url = `https://x/opdracht-documenten/${id}.pdf`;

    await db.registreerZaakRapport(id, url);

    const { data: opl } = await admin
      .from("opleveringen")
      .select("rapport_url, zaak_rapport_verzonden_at")
      .eq("opdracht_id", id)
      .single();
    expect(opl?.rapport_url).toBe(url);
    expect(opl?.zaak_rapport_verzonden_at).toBeTruthy();

    const { data: m } = await admin
      .from("meldingen")
      .select("opdracht_status, opgeleverd_at")
      .eq("id", id)
      .single();
    expect(m?.opdracht_status).toBe("opgeleverd");
    expect(m?.opgeleverd_at).toBeTruthy();
  });
});

test.describe("privacy: opdrachtgever ziet de oplevering pas na zaak-versturen", () => {
  test.use({ storageState: "e2e/.auth/opdrachtgever.json" });

  test("oplever-blok en interne notitie verschijnen pas na de zaak-verzending", async ({ page }) => {
    const interne = `INTERN-${Date.now()}`;
    const { id, klantNaam } = await seedOplevering({
      interne_opmerking: interne,
      opmerking: "Openbare opmerking",
    });

    // Vóór de zaak-verzending: de pagina laadt (klantnaam zichtbaar), maar het oplever-blok en de
    // interne notitie zijn verborgen voor de opdrachtgever.
    await page.goto(`/dashboard/opdracht/${id}`);
    await expect(page.getByText(klantNaam)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Opleverrapport" })).toHaveCount(0);
    await expect(page.getByText(interne)).toHaveCount(0);

    // Simuleer de zaak-verzending (zonder echt te mailen) via dezelfde db-functie als de route.
    await db.registreerZaakRapport(id, `https://x/opdracht-documenten/${id}.pdf`);

    // Nu ziet de opdrachtgever het oplever-blok, mét de interne notitie (die is voor de zaak bedoeld).
    await page.reload();
    await expect(page.getByRole("heading", { name: "Opleverrapport" })).toBeVisible();
    await expect(page.getByText(interne)).toBeVisible();
  });
});
