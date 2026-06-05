import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Browser-e2e voor de monteur-rol: hij ziet ALLEEN zijn eigen toegewezen klussen in de werkpool
 * (afscherming/RLS in de praktijk) en mag niet bij de kantoor-schermen (dashboard/planbord).
 * Draait onder de monteur-sessie (rk). Seedt eigen data en ruimt die op.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

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
const RK = "f0a2a56d-ccd9-434c-93b8-5f7257aa59c9"; // de testmonteur (ingelogd in deze tests)
const BEHEERDER = "443dff43-dc74-4216-8173-076f22973245";
const ANDERE_MONTEUR = "00000000-0000-4000-8000-000000000099";

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

let mijnNaam = "";
let andersNaam = "";
let mijnId = "";
let andersId = "";

async function seed(klant: string, toegewezen: string, user: string): Promise<string> {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: user,
    toegewezen_aan: toegewezen,
    opdrachtgever_id: zaak?.id ?? null,
  });
  return id;
}

test.beforeEach(async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  mijnNaam = `MIJN ${stamp}`;
  andersNaam = `ANDERS ${stamp}`;
  mijnId = await seed(mijnNaam, RK, RK);
  andersId = await seed(andersNaam, ANDERE_MONTEUR, BEHEERDER);
});

test.afterEach(async () => {
  for (const id of [mijnId, andersId]) {
    if (id) await admin.from("meldingen").delete().eq("id", id);
  }
});

test("monteur ziet in de werkpool alleen zijn eigen klus, niet die van een ander", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
  await expect(page.getByText(mijnNaam)).toBeVisible();
  await expect(page.getByText(andersNaam)).toHaveCount(0);
});

test("monteur wordt weggestuurd van het dashboard naar zijn werkpool", async ({ page }) => {
  await page.goto("/dashboard");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
});

test("monteur wordt weggestuurd van het planbord naar zijn werkpool", async ({ page }) => {
  await page.goto("/planbord");
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
});
