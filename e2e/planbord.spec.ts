import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan } from "@/lib/planbord";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Echte browser-e2e van het planbord: inplannen via het formulier én via slepen, telkens met een
 * bevestiging in de database. Elke test seedt zijn eigen opdracht (uniek) en ruimt die op, zodat de
 * gedeelde test-database schoon blijft en andere data ongemoeid.
 */

function leesEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = leesEnv();
const URL_ = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
const BEHEERDER = "443dff43-dc74-4216-8173-076f22973245";

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

function vandaagISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let uniek = "";
let seededId = "";

test.beforeEach(async () => {
  uniek = `E2E ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const zaak = await db.getStandaardOpdrachtgever();
  if (!zaak) throw new Error("Geen zaak gevonden; draai de migraties.");
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: uniek,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: zaak.id,
  });
  seededId = id;
});

test.afterEach(async () => {
  if (seededId) await admin.from("meldingen").delete().eq("id", seededId);
});

async function statusVan(id: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, toegewezen_aan, startdatum")
    .eq("id", id)
    .single();
  return data;
}

test("inplannen via het pool-formulier zet de status op concept_gepland", async ({ page }) => {
  await page.goto("/planbord");
  const kaart = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaart).toBeVisible();
  await kaart.getByRole("button", { name: "Inplannen" }).click();
  await kaart.getByRole("button", { name: "Op planbord zetten" }).click();

  await expect
    .poll(async () => (await statusVan(seededId))?.dashboard_status, { timeout: 12_000, intervals: [500] })
    .toBe("concept_gepland");
  const data = await statusVan(seededId);
  expect(data?.toegewezen_aan).toBeTruthy();
  expect(data?.startdatum).toBeTruthy();
});

test("inplannen door slepen van de pool naar een cel werkt", async ({ page }) => {
  const monteurs = await db.getMonteurs();
  test.skip(monteurs.length === 0, "Geen monteur-accounts om naar te slepen");
  const monteur = monteurs[0];
  const maandag = maandagVan(vandaagISO());

  await page.goto("/planbord");
  const kaart = page.locator("div.border-2.border-ink-muted").filter({ hasText: uniek });
  await expect(kaart).toBeVisible();

  const grip = kaart.getByRole("button", { name: "Sleep naar het planbord" });
  const cel = page.locator(`[data-testid="cel-${monteur.id}-${maandag}"]`).first();
  await expect(cel).toBeVisible();

  const g = await grip.boundingBox();
  const c = await cel.boundingBox();
  if (!g || !c) throw new Error("Greep of cel niet gevonden");

  // dnd-kit PointerSensor heeft een sleepdrempel van 6px: eerst een stukje bewegen, dan naar de cel.
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 25, g.y + g.height / 2 + 25, { steps: 6 });
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect
    .poll(async () => (await statusVan(seededId))?.dashboard_status, { timeout: 12_000, intervals: [500] })
    .toBe("concept_gepland");
  const data = await statusVan(seededId);
  expect(data?.toegewezen_aan).toBe(monteur.id);
  expect(data?.startdatum).toBe(maandag);
});
