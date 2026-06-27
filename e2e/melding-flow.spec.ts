import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * Melding-flow herinrichting: video op melding, detailpagina-herinrichting (koppen + afsluit-blok +
 * spoed-only label) en snel afsluiten ontdubbeld (meldingen-overzicht + begeleidend bericht, geen
 * media-invoer, ontsnap-knop, 0-meldingen-bevestiging).
 *
 * De video-UPLOAD zelf (VideoMaken) is al e2e-gedekt in oplever-upload.spec (zelfde component); hier
 * seeden we een melding met video via de db en checken dat hij in het bewerk-formulier terugkomt
 * ("Video vastgelegd"), zodat de create→opslag→lezen→formulier-keten gedekt is zonder flaky upload.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;

const klusIds: string[] = [];

async function maakKlus(prefix: string, opts: { eigen?: boolean } = {}): Promise<string> {
  // Eigen klus (geen opdrachtgever) => klant-levering altijd toegestaan (magKlantLeveren); handig om de
  // klant-optie in snel afsluiten deterministisch te tonen, los van de opdrachtgever-instelling.
  const zaak = opts.eigen ? null : await db.getStandaardOpdrachtgever();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `${prefix} ${stamp}`,
    klant_adres: "Teststraat 1",
    referentienummer: `MF${stamp}`,
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

async function seedMelding(
  opdrachtId: string,
  opts: { spoed: boolean; tekst: string; foto_urls?: string[]; video_url?: string | null },
): Promise<string> {
  const { id } = await db.createMonteurMelding({
    opdracht_id: opdrachtId,
    spoed: opts.spoed,
    ruwe_tekst: opts.tekst,
    spraak_tekst: null,
    foto_urls: opts.foto_urls ?? [],
    video_url: opts.video_url ?? null,
    user_id: RK,
  });
  return id;
}

test.afterEach(async () => {
  for (const id of klusIds.splice(0)) {
    await admin.from("opleveringen").delete().eq("opdracht_id", id);
    await admin.from("meldingen").delete().eq("opdracht_id", id); // monteur-meldingen op deze klus
    await admin.from("meldingen").delete().eq("id", id); // de klus zelf
  }
});

test("detailpagina: nieuwe koppen, melding-knop en afsluiten als blok; onderbalk alleen kluspool", async ({ page }) => {
  const id = await maakKlus("MF-DETAIL");
  await page.goto(`/opdracht/${id}`);

  await expect(page.getByRole("heading", { name: "Meldingen tijdens de klus" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beschadiging of manco melden" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Aan het einde van de klus" })).toBeVisible();
  const afsluiten = page.getByRole("link", { name: /Klus afsluiten/ });
  await expect(afsluiten).toHaveCount(1);
  await expect(afsluiten).toHaveAttribute("href", `/opdracht/${id}/afronden`);

  // Onderbalk: alleen "Terug naar kluspool" (afsluiten is uit de balk gehaald).
  await expect(page.getByRole("link", { name: "Terug naar kluspool" })).toBeVisible();

  // Het afsluit-blok leidt naar de afsluit-keuze.
  await afsluiten.click();
  await page.waitForURL((u) => new URL(u).pathname.endsWith(`/opdracht/${id}/afronden`));
});

test("meldingenlijst: alleen spoed krijgt een label; gewone melding zonder label", async ({ page }) => {
  const id = await maakKlus("MF-SPOED");
  await seedMelding(id, { spoed: true, tekst: "Kraan ontbreekt" });
  await seedMelding(id, { spoed: false, tekst: "Zijwand beschadigd" });

  await page.goto(`/opdracht/${id}`);
  await expect(page.getByText("Kraan ontbreekt")).toBeVisible();
  await expect(page.getByText("Zijwand beschadigd")).toBeVisible();

  // Eén spoed-badge (voor de spoed-melding), geen oude "Open"/"Achteraf"-labels.
  await expect(page.getByText("Spoed", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Open", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Achteraf", { exact: true })).toHaveCount(0);
});

test("melding-formulier heeft een video-invoer; een opgeslagen video komt terug in het bewerk-formulier", async ({ page }) => {
  const id = await maakKlus("MF-VIDEO");

  // Nieuw-formulier: video-invoer aanwezig (Opnemen-knop is uniek voor VideoMaken).
  await page.goto(`/opdracht/${id}/melding`);
  await expect(page.getByRole("button", { name: "Opnemen" })).toBeVisible();

  // Seed een melding met video en open het bewerk-formulier: de video komt terug ("Video vastgelegd").
  // Geen foto-url hier: next/image zou een niet-geconfigureerde test-host weigeren (geen echte foto's nodig
  // voor deze video-check; foto-preview is elders gedekt).
  const meldingId = await seedMelding(id, {
    spoed: false,
    tekst: "Front beschadigd, video erbij",
    video_url: "https://x/m-video.mp4",
  });
  await page.goto(`/opdracht/${id}/melding/${meldingId}`);
  await expect(page.getByText("Video vastgelegd")).toBeVisible();
});

test("snel afsluiten: meldingen-overzicht + begeleidend bericht, geen media-invoer, ontsnap-knop", async ({ page }) => {
  // Foto-URL's op een geconfigureerde host (*.supabase.co/storage/**), anders weigert next/image ze
  // bij het renderen van de thumbnails. De afbeeldingen bestaan niet (404), dat geeft alleen een lege
  // tegel; het gaat hier om de lay-out en de telling.
  const fotoUrl = (n: string) => `${SUPABASE_URL}/storage/v1/object/public/oplever/mf-${n}.jpg`;
  const id = await maakKlus("MF-SNEL");
  await seedMelding(id, { spoed: true, tekst: "Kraan ontbreekt", video_url: "https://x/v.mp4" });
  await seedMelding(id, { spoed: false, tekst: "Greep nabestellen", foto_urls: [fotoUrl("a"), fotoUrl("b")] });

  await page.goto(`/opdracht/${id}/afronden/snel`);

  // Overzicht "Dit gaat mee in het rapport" toont de meldingen.
  await expect(page.getByRole("heading", { name: /Dit gaat mee in het rapport/ })).toBeVisible();
  await expect(page.getByText("Kraan ontbreekt")).toBeVisible();
  await expect(page.getByText("Greep nabestellen")).toBeVisible();

  // Geen media-invoer-blok meer ("De oplevering" met foto/video).
  await expect(page.getByRole("heading", { name: /^De oplevering/ })).toHaveCount(0);

  // Geen verwarrende "Ook aan de klant opleveren"-schakelaar in snel afsluiten (die opende vroeger het
  // interne blok dat hier weg is). Klant-levering loopt via de verstuur-optie.
  await expect(page.getByText("Ook aan de klant opleveren")).toHaveCount(0);

  // Wel een begeleidend bericht en het bestaande versturen-blok.
  await expect(page.getByText(/Begeleidend bericht/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Naar de opdrachtgever" })).toBeVisible();

  // Ontsnap-knop naar de volledige oplevering (staat nu bovenaan, duidelijker tekst).
  const ontsnap = page.getByRole("link", { name: /Uitgebreid opleveren/ });
  await expect(ontsnap).toBeVisible();
  await expect(ontsnap).toHaveAttribute("href", `/opdracht/${id}/opleveren`);
});

test("melding-concept blijft bewaard na weg-navigeren en terugkomen (vangnet)", async ({ page }) => {
  const id = await maakKlus("MF-CONCEPT");

  await page.goto(`/opdracht/${id}/melding`);
  const tekst = `Vangnet-test ${Date.now()}`;
  await page.getByLabel("Wat is er aan de hand?").fill(tekst);

  // Weg-navigeren zonder op te slaan (zoals de telefoon-terugknop), dan terug naar het formulier.
  await page.goto(`/opdracht/${id}`);
  await page.goto(`/opdracht/${id}/melding`);

  // De invoer is hersteld uit het lokale vangnet.
  await expect(page.getByLabel("Wat is er aan de hand?")).toHaveValue(tekst);
});

test("snel afsluiten: geen 'Naar de klant'-optie; klant-levering loopt via uitgebreid opleveren", async ({ page }) => {
  const id = await maakKlus("MF-KLANT", { eigen: true }); // eigen klus => klant-levering zou toegestaan zijn
  await seedMelding(id, { spoed: false, tekst: "Iets gemeld" });

  await page.goto(`/opdracht/${id}/afronden/snel`);

  // Klant-levering is bewust uit snel afsluiten gehaald (gaf een verwarrende interne-notitie-waarschuwing).
  await expect(page.getByRole("button", { name: "Naar de klant" })).toHaveCount(0);
  await expect(page.getByText("Ook aan de klant opleveren")).toHaveCount(0);

  // Wel een verwijzing naar uitgebreid opleveren (daar kan klant-levering met handtekening/akkoord).
  await expect(page.getByText("Uitgebreid opleveren")).toBeVisible();

  // De opdrachtgever-optie bestaat wél in snel afsluiten.
  await expect(page.getByRole("button", { name: "Naar de opdrachtgever" })).toBeVisible();
});

test("snel afsluiten zonder meldingen: lege staat + bevestiging 'Versturen zonder melding?'", async ({ page }) => {
  const id = await maakKlus("MF-LEEG");
  await page.goto(`/opdracht/${id}/afronden/snel`);

  // Lege staat in het overzicht.
  await expect(page.getByText(/Geen meldingen op deze klus/)).toBeVisible();

  // Versturen naar de opdrachtgever -> ontvanger kiezen (Anders) -> adres -> versturen.
  await page.getByRole("button", { name: "Naar de opdrachtgever" }).click();
  await page.getByRole("button", { name: /Kies een ontvanger/ }).click();
  await page.getByRole("option", { name: "Anders (typ zelf)" }).click();
  await page.getByLabel("E-mailadres voor het rapport").fill("e2e-zonder-melding@kluslus.test");

  // De 0-meldingen-bevestiging moet verschijnen; we annuleren en blijven op de pagina (geen verzending).
  let dialogTekst = "";
  page.once("dialog", (d) => {
    dialogTekst = d.message();
    void d.dismiss();
  });
  await page.getByRole("button", { name: "Stuur naar opdrachtgever" }).click();
  await expect.poll(() => dialogTekst).toContain("Versturen zonder melding?");
  await expect(page).toHaveURL(new RegExp(`/opdracht/${id}/afronden/snel`));
});
