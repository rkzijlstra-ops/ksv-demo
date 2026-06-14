import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER as BEHEERDER_ACC } from "./test-env";

/**
 * Browser-e2e voor de opdrachtgever-rol (Ed): hij ziet op het dashboard alleen de opdrachten van
 * ZIJN zaak, niet ad-hoc klussen en niet die van een andere zaak (zaak-scheiding + RLS in de
 * praktijk), en hij mag niet bij de monteur-werkpool. Draait onder een tijdelijke test-opdrachtgever
 * (gekoppeld aan de standaard-zaak), die global-setup aanmaakt en global-teardown weer opruimt.
 */

test.use({ storageState: "e2e/.auth/opdrachtgever.json" });

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_SECRET;
const BEHEERDER = BEHEERDER_ACC.uid;

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

let zaakNaam = "";
let adhocNaam = "";
let andereNaam = "";
let zaakId = "";
let adhocId = "";
let andereId = "";
let andereZaakId = "";

async function maak(klant: string, opdrachtgeverId: string | null): Promise<string> {
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `OG${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    opdrachtgever_id: opdrachtgeverId,
  });
  return id;
}

test.beforeEach(async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  zaakNaam = `ZAAK ${stamp}`;
  adhocNaam = `ADHOC ${stamp}`;
  andereNaam = `ANDEREZAAK ${stamp}`;

  const zaak = await db.getStandaardOpdrachtgever();
  // Tweede zaak (om cross-zaak-afscherming te testen).
  const { data: az } = await admin
    .from("opdrachtgevers")
    .insert({ naam: `E2E Andere Zaak ${stamp}` })
    .select("id")
    .single();
  andereZaakId = az!.id;

  zaakId = await maak(zaakNaam, zaak?.id ?? null); // eigen zaak (KSV)
  adhocId = await maak(adhocNaam, null); // ad-hoc, geen zaak
  andereId = await maak(andereNaam, andereZaakId); // andere zaak
});

test.afterEach(async () => {
  for (const id of [zaakId, adhocId, andereId]) {
    if (id) await admin.from("meldingen").delete().eq("id", id);
  }
  if (andereZaakId) await admin.from("opdrachtgevers").delete().eq("id", andereZaakId);
});

test("opdrachtgever ziet op het dashboard alleen de opdrachten van zijn eigen zaak", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText(zaakNaam)).toBeVisible();
  await expect(page.getByText(adhocNaam)).toHaveCount(0); // ad-hoc hoort niet op het dashboard
  await expect(page.getByText(andereNaam)).toHaveCount(0); // andere zaak: afgeschermd (RLS)
});

test("opdrachtgever mag bij het planbord", async ({ page }) => {
  await page.goto("/planbord");
  await expect(page).toHaveURL(/\/planbord/);
  await expect(page.getByRole("heading", { name: "Planbord" })).toBeVisible();
});

test("opdrachtgever wordt weggestuurd van de monteur-werkpool naar zijn dashboard", async ({ page }) => {
  await page.goto("/");
  // Wacht op de redirect (async door het laadscherm), lees de URL niet meteen af.
  await page.waitForURL((u) => new URL(u).pathname === "/dashboard");
});

test("opdrachtgever mag niet bij het gebruikersbeheer (beheerder-only)", async ({ page }) => {
  await page.goto("/gebruikers");
  await page.waitForURL((u) => new URL(u).pathname !== "/gebruikers");
});

test("opdrachtgever heeft een inbound-mailadres op Mijn gegevens (mail doorsturen naar het dashboard)", async ({
  page,
}) => {
  await page.goto("/mijn-gegevens");
  await expect(page.getByText("Klussen per mail ontvangen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kopieer" })).toBeVisible();
});
