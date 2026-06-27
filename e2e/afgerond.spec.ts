import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";

/**
 * Snel afsluiten = een uitgeklede oplevering (verkorte PDF), met de "er komt nog een vervolg"-optie.
 *
 * De UI-smoke toetst dat de verkorte flow rendert (geen handtekening/voorvertoon, wél het vervolg-vinkje).
 * De vervolg-KETEN toetsen we op db-niveau (zoals verzending.spec), zodat er geen echte mail nodig is:
 * we roepen dezelfde db-functies aan die de route (`/api/opdrachten/[id]/rapport`, vervolg-tak) gebruikt.
 * Het echte versturen-met-mail wordt los gekeurd op de test-omgeving (allowlist) en in mail.spec.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR_ACC.uid;
let opdrachtId = "";

/** Legt een oplevering-concept aan op een opdracht, zodat de vervolg-tak iets heeft om vast te leggen. */
async function seedOpleveringConcept(id: string) {
  await db.upsertOpleveringConcept({
    opdracht_id: id,
    eindstaat_foto_urls: [],
    video_url: null,
    opmerking: "Snel afgesloten, vervolg nodig.",
    user_id: RK,
  });
}

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `AFROND ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (opdrachtId) {
    await admin.from("opleveringen").delete().eq("opdracht_id", opdrachtId);
    await admin.from("meldingen").delete().eq("id", opdrachtId);
  }
});

test("snel afsluiten toont de verkorte oplever-flow (geen handtekening, wél vervolg-vinkje)", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden`);
  await expect(page.getByRole("heading", { name: "Op welke manier sluit je af?" })).toBeVisible();
  await page.getByRole("link", { name: /snel afsluiten/i }).click();
  await page.waitForURL((u) => new URL(u).pathname.endsWith("/afronden/snel"));

  // Verkort: geen handtekening-stap en geen voorvertoon-kaart, wél het vervolg-vinkje en de
  // verstuurkaart naar de opdrachtgever.
  await expect(page.getByRole("heading", { name: /handtekening/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Rapport voorvertonen" })).toHaveCount(0);
  await expect(page.getByText("Klus is niet af.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Naar de opdrachtgever" })).toBeVisible();
});

test("monteur meldt een klus niet doorgegaan via het keuzescherm", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/afronden`);
  await page.getByRole("button", { name: /niet doorgegaan/i }).click();
  await page.getByRole("textbox").fill("Meerdere keren aangebeld, niemand thuis.");
  await page.getByRole("button", { name: "Terugmelden" }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/");

  const { data } = await admin.from("meldingen").select("teruggemeld_at").eq("id", opdrachtId).single();
  expect(data?.teruggemeld_at).not.toBeNull();
});

test("vervolg op een opdrachtgever-klus: opgeleverd met label 'vervolg nodig', blijft toegewezen", async () => {
  await seedOpleveringConcept(opdrachtId);
  const url = `https://x/opdracht-documenten/${opdrachtId}-verkort.pdf`;

  // Dit is exact wat de route in de vervolg-tak doet: gewoon opleveren + het label. Geen ontplannen meer.
  await db.registreerVerkortRapportVervolg(opdrachtId, url);

  const { data: opl } = await admin
    .from("opleveringen")
    .select("rapport_url, zaak_rapport_verzonden_at")
    .eq("opdracht_id", opdrachtId)
    .single();
  expect(opl?.rapport_url).toBe(url);
  expect(opl?.zaak_rapport_verzonden_at).toBeTruthy();

  const { data: m } = await admin
    .from("meldingen")
    .select("afgerond_vervolg_nodig, opdracht_status, dashboard_status, toegewezen_aan")
    .eq("id", opdrachtId)
    .single();
  expect(m?.afgerond_vervolg_nodig).toBe(true); // label "Vervolg nodig"
  expect(m?.opdracht_status).toBe("opgeleverd"); // gewoon opgeleverd (groen, te verwerken)
  expect(m?.dashboard_status).toBe("opgeleverd");
  expect(m?.toegewezen_aan).toBe(RK); // blijft toegewezen, niet teruggeworpen naar de pool
});

test("vervolg op een ad-hoc klus (geen kantoor) blijft bij de monteur", async () => {
  const { id: adhocId } = await db.createOpdracht({
    documenttype: "onbekend",
    klant_naam: `ADHOC ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `A${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: null,
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: null,
  });
  try {
    await seedOpleveringConcept(adhocId);
    // Vervolg levert nu gewoon op (groen) + het label; blijft bij de monteur (toegewezen).
    await db.registreerVerkortRapportVervolg(adhocId, `https://x/${adhocId}-verkort.pdf`);

    const { data } = await admin
      .from("meldingen")
      .select("afgerond_vervolg_nodig, toegewezen_aan, opdracht_status")
      .eq("id", adhocId)
      .single();
    expect(data?.afgerond_vervolg_nodig).toBe(true);
    expect(data?.toegewezen_aan).toBe(RK); // bleef bij de monteur
    expect(data?.opdracht_status).toBe("opgeleverd");
  } finally {
    await admin.from("opleveringen").delete().eq("opdracht_id", adhocId);
    await admin.from("meldingen").delete().eq("id", adhocId);
  }
});
