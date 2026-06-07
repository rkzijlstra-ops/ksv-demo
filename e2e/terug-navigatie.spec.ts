import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan } from "@/lib/planbord";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "./test-env";

/**
 * De terugknop op de opdracht-detailpagina volgt de herkomst: vanuit het planbord terug naar het
 * planbord, vanuit het dashboard terug naar het dashboard. De planbord-kaart geeft die context mee
 * via ?from=planbord. Seedt een geplande klus op het bord en ruimt die op.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

function vandaagISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ankerVoorDatum(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

let seededId = "";
let maandag = "";

test.beforeEach(async () => {
  const monteurs = await db.getMonteurs();
  test.skip(monteurs.length === 0, "Geen monteur-accounts om op het bord te plaatsen");
  const monteur = monteurs[0];
  maandag = maandagVan(ankerVoorDatum(vandaagISO()));
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: `TERUG ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `T${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });
  seededId = id;
  await db.planOpdracht(seededId, { toegewezen_aan: monteur.id, monteur_naam: monteur.naam, startdatum: maandag, starttijd: null, duur_dagen: 1 });
});

test.afterEach(async () => {
  if (seededId) await admin.from("meldingen").delete().eq("id", seededId);
});

test("vanuit het planbord wijst de terugknop naar het planbord", async ({ page }) => {
  await page.goto(`/dashboard/opdracht/${seededId}?from=planbord&week=${maandag}`);
  const terug = page.getByRole("link", { name: "Planbord" });
  await expect(terug).toBeVisible();
  await terug.click();
  await page.waitForURL((url) => url.pathname === "/planbord");
});

test("zonder herkomst wijst de terugknop naar het dashboard", async ({ page }) => {
  await page.goto(`/dashboard/opdracht/${seededId}`);
  const terug = page.getByRole("link", { name: "Dashboard" });
  await expect(terug).toBeVisible();
  await terug.click();
  await page.waitForURL((url) => url.pathname === "/dashboard");
});

test("de planbord-kaart geeft from=planbord mee in de link", async ({ page }) => {
  await page.goto("/planbord");
  const kaart = page.locator(`a[href*="/dashboard/opdracht/${seededId}"]`);
  await expect(kaart).toBeVisible();
  const href = await kaart.getAttribute("href");
  expect(href).toContain("from=planbord");
});
