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
  opts: {
    interne_opmerking?: string | null;
    opmerking?: string | null;
    klant_rapport_email?: string | null;
  } = {},
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
    klant_rapport_email: opts.klant_rapport_email ?? null,
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

test.describe("verzendgeschiedenis (append-only)", () => {
  test("elke verzending wordt toegevoegd in plaats van overschreven", async () => {
    const { id } = await seedOplevering();
    await db.logRapportVerzending({
      opdracht_id: id,
      doelgroep: "klant",
      naar: "klant@voorbeeld.test",
      rapport_url: `https://x/${id}-klant.pdf`,
      door_id: MONTEUR.uid,
    });
    await db.logRapportVerzending({
      opdracht_id: id,
      doelgroep: "zaak",
      naar: "zaak@voorbeeld.test",
      rapport_url: `https://x/${id}.pdf`,
      door_id: MONTEUR.uid,
    });

    const vz = await db.getRapportVerzendingen(id);
    expect(vz).toHaveLength(2);
    // Beide verzendingen blijven bewaard (geen overschrijving), met hun eigen adres.
    expect(vz.map((v) => v.naar).sort()).toEqual(["klant@voorbeeld.test", "zaak@voorbeeld.test"]);
    expect(vz.map((v) => v.doelgroep).sort()).toEqual(["klant", "zaak"]);
  });
});

test.describe("werkpool-marker: rapport niet verzonden", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  test("een klus met oplevering-in-uitvoering toont 'Rapport niet verzonden' tot de zaak-verzending", async ({
    page,
  }) => {
    // seedOplevering zet een handtekening op het concept (werk gedaan) en wijst de klus aan de monteur toe.
    const { id, klantNaam } = await seedOplevering();

    await page.goto("/");
    const kaart = page.locator("a", { hasText: klantNaam });
    await expect(kaart).toBeVisible();
    await expect(kaart.getByText("Rapport niet verzonden")).toBeVisible();
    // (a) De linker kleurstrip van de kaart is geel (van een afstand zichtbaar, los van de badge).
    await expect(kaart).toHaveClass(/border-l-urgent-geel/);
    // (b) Bovenaan de werkpool staat een teller die eraan herinnert.
    await expect(page.getByText(/rapport nog naar de zaak versturen/i)).toBeVisible();

    // Na de zaak-verzending is de klus opgeleverd: hij zakt naar history en de marker is weg uit actief.
    await db.registreerZaakRapport(id, `https://x/${id}.pdf`);
    await page.reload();
    await expect(page.locator("a", { hasText: klantNaam }).getByText("Rapport niet verzonden")).toHaveCount(0);
    // De teller is ook weg zodra er niets meer te versturen is.
    await expect(page.getByText(/rapport nog naar de zaak versturen/i)).toHaveCount(0);
  });
});

test.describe("privacy-waarschuwing bij versturen naar de klant", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  test("waarschuwt dat de klant alles ziet; afbreken stuurt niet", async ({ page }) => {
    const { id } = await seedOplevering({ klant_rapport_email: "klant@voorbeeld.test" });

    await page.goto(`/opdracht/${id}/opleveren`);
    await page.getByRole("button", { name: "Naar de klant" }).click();
    // Klant-adres is voorinvuld; de knop is dus actief.
    await expect(page.getByLabel("E-mailadres van de klant")).toHaveValue("klant@voorbeeld.test");

    // De waarschuwing verschijnt en we breken hem af: er mag dan niets verstuurd worden.
    let dialoogTekst = "";
    page.once("dialog", (d) => {
      dialoogTekst = d.message();
      d.dismiss();
    });
    await page.getByRole("button", { name: "Stuur naar klant" }).click();

    expect(dialoogTekst).toContain("alle foto's en meldingen");
    expect(dialoogTekst).toContain("interne notitie");

    // Status met rust: klant-verzending niet geregistreerd.
    const { data } = await admin
      .from("opleveringen")
      .select("klant_rapport_verzonden_at")
      .eq("opdracht_id", id)
      .single();
    expect(data?.klant_rapport_verzonden_at).toBeNull();
  });
});

test.describe("ontvanger-keuze: eigen dropdown in app-stijl", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  test("open de keuzelijst, kies een keukenzaak; de knop toont de keuze en sluit", async ({ page }) => {
    const { id } = await seedOplevering();
    await page.goto(`/opdracht/${id}/opleveren`);
    // Wacht tot het concept geladen is (handtekening "Gezet"), anders kan de async load een net
    // gekozen ontvanger weer overschrijven met het bewaarde (lege) adres.
    await expect(page.getByText("Gezet")).toBeVisible();

    await page.getByRole("button", { name: "Naar de opdrachtgever" }).click();
    const knop = page.getByRole("button", { name: "Kies een ontvanger" });
    await expect(knop).toBeVisible();
    await knop.click();

    // De eigen dropdown toont de groepen en opties.
    await expect(page.getByText("Keukenzaken")).toBeVisible();
    await page.getByRole("option", { name: "Keukenstudio Voorschoten" }).click();

    // De knop toont nu de gekozen ontvanger en de lijst is gesloten.
    await expect(page.getByRole("button", { name: "Keukenstudio Voorschoten" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Keukenstudio Voorschoten" })).toHaveCount(0);
  });
});
