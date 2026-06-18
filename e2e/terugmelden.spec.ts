import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, MONTEUR } from "./test-env";

/**
 * Terugmelden (blok 9) + logboek (blok 8), cross-rol: de monteur meldt een door kantoor ingeschoten
 * klus terug, die verdwijnt uit zijn actieve werkpool en kantoor ziet hem met een markering plus het
 * logboek. Verifieert dat een Ed-klus nooit stil verdwijnt en de actie herleidbaar is.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

async function seedEdKlus(klant: string): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `TM${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid, // door KANTOOR ingeschoten
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  return id;
}

test.describe("monteur meldt een Ed-klus terug", () => {
  test.use({ storageState: "e2e/.auth/monteur.json" });

  let id = "";
  let klant = "";
  test.beforeEach(async () => {
    klant = `TERUGMELD ${Date.now()}`;
    id = await seedEdKlus(klant);
  });
  test.afterEach(async () => {
    if (id) {
      await admin.from("gebeurtenissen").delete().eq("opdracht_id", id);
      await admin.from("meldingen").delete().eq("id", id);
    }
  });

  test("een Ed-klus toont een terugmeld-knop en GEEN prullenbakje", async ({ page }) => {
    await page.goto("/");
    const kaart = page.locator(`a[href="/opdracht/${id}"]`);
    await expect(kaart).toBeVisible();
    await expect(kaart.getByRole("button", { name: "Terugmelden" })).toBeVisible();
    await expect(page.getByRole("button", { name: `Klus ${klant} verwijderen` })).toHaveCount(0);
  });

  test("terugmelden haalt de klus uit de actieve werkpool en logt de gebeurtenis", async ({ page }) => {
    const res = await page.request.post(`/api/opdrachten/${id}/terugmelden`, {
      data: { reden: "klant_niet_thuis", toelichting: "3x aangebeld" },
    });
    expect(res.ok()).toBeTruthy();

    // Database: teruggemeld + gelogd, status terug naar de pool ("binnen"), planning leeg.
    const { data: m } = await admin
      .from("meldingen")
      .select("teruggemeld_at, teruggemeld_reden, dashboard_status, startdatum")
      .eq("id", id)
      .single();
    expect(m?.teruggemeld_at).toBeTruthy();
    expect(m?.teruggemeld_reden).toBe("klant_niet_thuis");
    expect(m?.dashboard_status).toBe("binnen");
    expect(m?.startdatum).toBeNull();
    const { data: g } = await admin.from("gebeurtenissen").select("actie").eq("opdracht_id", id);
    expect((g ?? []).some((r) => r.actie === "teruggemeld")).toBe(true);
    // Blijvende poging-historie (blok 22) met snapshot.
    const { data: p } = await admin
      .from("terugmeld_pogingen")
      .select("reden, klant_naam, monteur_id")
      .eq("opdracht_id", id);
    expect((p ?? []).length).toBe(1);
    expect(p?.[0]?.monteur_id).toBe(MONTEUR.uid);

    // Werkpool: niet meer in de actieve lijst (zit in de ingeklapte geschiedenis).
    await page.goto("/");
    await expect(page.getByText("Werkpool")).toBeVisible();
    await expect(page.getByText(klant)).toHaveCount(0);
    await page.getByRole("button", { name: /Geschiedenis/ }).click();
    await expect(page.getByText(klant)).toBeVisible();
  });

  test("terugmelden via de knop toont een bevestiging en navigeert NIET naar de klus (flits-fix)", async ({ page }) => {
    await page.goto("/");
    const kaart = page.locator(`a[href="/opdracht/${id}"]`);
    await expect(kaart).toBeVisible();
    await kaart.getByRole("button", { name: "Terugmelden" }).click();

    const dialoog = page.getByRole("dialog", { name: "Klus terugmelden aan kantoor" });
    await expect(dialoog).toBeVisible();
    await dialoog.getByRole("button", { name: "Terugmelden" }).click();

    // Bevestiging in beeld, en cruciaal: we zijn NIET doorgeschoten naar de detailpagina (de flits-bug).
    await expect(page.getByText("Teruggemeld bij kantoor")).toBeVisible();
    await expect(page).not.toHaveURL(/\/opdracht\//);

    // Na "Klaar" verdwijnt de klus uit de actieve werkpool.
    await page.getByRole("button", { name: "Klaar" }).click();
    await expect(page.getByText(klant)).toHaveCount(0);
  });
});

/**
 * De herkansing-keten (datalaag): nadat een klus is teruggemeld, moet opnieuw uitsturen of alsnog
 * opleveren de transiënte terugmeld-vlag opruimen, zodat de klus geen strijdige toestand achterlaat.
 * Dit zijn de cross-rol-overgangen die eerder ontbraken.
 */
test.describe("herkansing na terugmelden (datalaag)", () => {
  let id = "";
  test.afterEach(async () => {
    if (id) await admin.from("meldingen").delete().eq("id", id);
    id = "";
  });

  async function meldTerug(klant: string): Promise<string> {
    const opdrachtId = await seedEdKlus(klant);
    await db.markeerTeruggemeld(opdrachtId, {
      reden: "klant_niet_thuis",
      toelichting: "niemand thuis",
      monteurId: MONTEUR.uid,
      monteurNaam: "E2E Monteur",
      klantNaam: klant,
      klantAdres: "Teststraat 1",
      referentienummer: null,
    });
    return opdrachtId;
  }

  test("opnieuw uitsturen wist de terugmeld-vlag en maakt de klus weer actief bij de monteur", async () => {
    id = await meldTerug(`HERKANSING ${Date.now()}`);
    // Kantoor plant opnieuw in (naar de beheerder als tweede inplanbare persoon) en verstuurt.
    await db.planOpdracht(id, {
      toegewezen_aan: BEHEERDER.uid,
      monteur_naam: "Tweede Monteur",
      startdatum: "2026-07-01",
      starttijd: null,
      duur_dagen: 1,
    });
    await db.markeerVerzonden(id, {
      toegewezen_aan: BEHEERDER.uid,
      monteur_naam: "Tweede Monteur",
      startdatum: "2026-07-01",
      starttijd: null,
    });

    const { data: m } = await admin
      .from("meldingen")
      .select("teruggemeld_at, dashboard_status, toegewezen_aan")
      .eq("id", id)
      .single();
    // Transiënte vlag weg, klus weer een verse afspraak bij de ontvangende persoon.
    expect(m?.teruggemeld_at).toBeNull();
    expect(m?.dashboard_status).toBe("gepland");
    expect(m?.toegewezen_aan).toBe(BEHEERDER.uid);

    // De klus staat actief in de werkpool van de ontvangende persoon (niet in zijn geschiedenis).
    const werkpool = await db.getWerkpoolVoor(BEHEERDER.uid);
    expect(werkpool.some((w) => w.id === id)).toBe(true);

    // De poging-historie blijft bewaard (blijvende geschiedenis voor de eerste monteur).
    const pogingen = await db.getTerugmeldPogingenVoor(MONTEUR.uid);
    expect(pogingen.some((p) => p.opdracht_id === id)).toBe(true);
  });

  test("alsnog opleveren ruimt de terugmeld-vlag op en tilt de klus uit de te-plannen-pool", async () => {
    id = await meldTerug(`OPLEVER-NA-TM ${Date.now()}`);
    // De klus lag teruggemeld op "binnen". De monteur levert hem alsnog op (klant kwam toch thuis).
    await admin.from("opleveringen").insert({ opdracht_id: id, uitkomst: "afgerond", eindstaat_foto_urls: [], user_id: MONTEUR.uid });
    await db.registreerZaakRapport(id, "https://storage.example/rapport-na-tm.pdf");

    const { data: m } = await admin
      .from("meldingen")
      .select("opdracht_status, dashboard_status, teruggemeld_at")
      .eq("id", id)
      .single();
    expect(m?.opdracht_status).toBe("opgeleverd");
    // Cruciaal: niet meer in de te-plannen-pool (geen dubbel-inplan), en geen strijdige terugmeld-vlag.
    expect(m?.dashboard_status).toBe("opgeleverd");
    expect(m?.teruggemeld_at).toBeNull();
  });
});

test.describe("kantoor ziet de terugmelding en het logboek", () => {
  test.use({ storageState: "e2e/.auth/beheerder.json" });

  let id = "";
  let klant = "";
  test.beforeEach(async () => {
    klant = `TMKANTOOR ${Date.now()}`;
    id = await seedEdKlus(klant);
    await db.markeerTeruggemeld(id, {
      reden: "werk_niet_afgerond",
      toelichting: "onderdeel ontbrak",
      monteurId: MONTEUR.uid,
      monteurNaam: "E2E Monteur",
      klantNaam: klant,
      klantAdres: "Teststraat 1",
      referentienummer: null,
    });
    await db.logGebeurtenis({
      opdracht_id: id, actie: "teruggemeld", door_id: MONTEUR.uid, door_naam: "E2E Monteur",
      door_rol: "monteur", details: { reden: "werk_niet_afgerond", toelichting: "onderdeel ontbrak" },
    });
  });
  test.afterEach(async () => {
    if (id) {
      await admin.from("gebeurtenissen").delete().eq("opdracht_id", id);
      await admin.from("meldingen").delete().eq("id", id);
    }
  });

  test("de opdracht-detailpagina toont de markering en het logboek met de reden", async ({ page }) => {
    await page.goto(`/dashboard/opdracht/${id}`);
    await expect(page.getByText("Logboek", { exact: false })).toBeVisible();
    await expect(page.getByText("Teruggemeld aan kantoor")).toBeVisible();
    await expect(page.getByText("Werk niet af te ronden")).toBeVisible();
  });

  test("het dashboard heeft een filter 'Teruggemeld' en toont de reden op de kaart", async ({ page }) => {
    await page.goto("/dashboard");
    // De filter-chip "Teruggemeld" bestaat; klikken filtert op de teruggemelde klussen.
    const chip = page.getByRole("button", { name: /^Teruggemeld/ });
    await expect(chip).toBeVisible();
    await chip.click();
    // Onze teruggemelde klus is zichtbaar, met de reden op de kaart (niet alleen op de detailpagina).
    await expect(page.getByText(klant)).toBeVisible();
    await expect(page.getByText("Werk niet af te ronden").first()).toBeVisible();
  });
});
