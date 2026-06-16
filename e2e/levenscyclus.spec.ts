import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import { wachtOpHydratie } from "./hydratie";

/**
 * Keten-e2e: de HELE happy-path van een klus in één doorloop, over beide rollen (kantoor <-> monteur),
 * met een status-controle bij ELKE overgang. Dekt het gat dat alle losse specs per-overgang testen maar
 * geen enkele de keten als geheel.
 *
 * Bewuste keuzes (zodat de gewone CI-run geen echte mail/SMS stuurt en niet afhangt van de Claude-parser):
 * - Inschieten, bevestigen en de dashboard-eindcontrole gaan via de ECHTE UI (de cross-rol-handoffs).
 * - Plannen + versturen + zaak-verzending gaan via de db-laag (dezelfde functies die de routes na een
 *   geslaagde mail aanroepen). Het UI-slepen op het planbord is gedekt door planbord.spec; de echte
 *   mail-inhoud door de *-mail.test.ts (unit) en mail-flows.spec (E2E_MAIL). De foto/handtekening-UI
 *   van het opleveren is gedekt door opleveren.spec; hier zetten we het oplever-concept via de db.
 */

test.use({ storageState: "e2e/.auth/beheerder.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR.uid;

let id = "";
let klant = "";

async function statusVan(opdrachtId: string) {
  const { data } = await admin
    .from("meldingen")
    .select("dashboard_status, opdracht_status, toegewezen_aan")
    .eq("id", opdrachtId)
    .single();
  return data;
}

test.afterEach(async () => {
  if (id) await admin.from("opleveringen").delete().eq("opdracht_id", id);
  if (klant) await admin.from("meldingen").delete().eq("klant_naam", klant);
  id = "";
  klant = "";
});

test("volledige klus-levenscyclus: inschieten -> plannen -> versturen -> bevestigen -> opleveren -> dashboard", async ({
  browser,
}) => {
  const ctxK = await browser.newContext({ storageState: "e2e/.auth/beheerder.json" });
  const ctxM = await browser.newContext({ storageState: "e2e/.auth/monteur.json" });
  try {
    const pageK = await ctxK.newPage();
    const pageM = await ctxM.newPage();
    klant = `LEVENSCYCLUS ${Date.now()}`;

    // 1. KANTOOR schiet een klus in via de UI ("Nieuwe klus"), zonder PDF.
    await pageK.goto("/dashboard");
    await wachtOpHydratie(pageK);
    await pageK.getByRole("button", { name: "Nieuwe klus" }).click();
    await pageK.getByLabel("Klantnaam").fill(klant);
    await pageK.getByLabel("Adres").fill("Dorpsstraat 14, Noordwijkerhout");
    await pageK.getByRole("button", { name: "Klus opslaan" }).click();
    await expect(
      pageK.locator('a[href^="/dashboard/opdracht/"]', { hasText: klant }),
    ).toBeVisible({ timeout: 15_000 });

    // id ophalen en status = 'binnen' (te plannen).
    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from("meldingen")
            .select("id")
            .eq("klant_naam", klant)
            .order("created_at", { ascending: false })
            .limit(1);
          id = data?.[0]?.id ?? "";
          return id;
        },
        { timeout: 10_000, intervals: [400] },
      )
      .not.toBe("");
    expect((await statusVan(id))?.dashboard_status).toBe("binnen");

    // 2. KANTOOR plant de klus bij de monteur met datum (kantoor-actie via db; slepen = planbord.spec).
    await db.planOpdracht(id, {
      toegewezen_aan: RK,
      monteur_naam: "E2E Monteur",
      startdatum: "2026-06-20",
      starttijd: null,
      duur_dagen: 1,
    });
    expect((await statusVan(id))?.dashboard_status).toBe("concept_gepland");

    // 3. KANTOOR verstuurt naar de monteur (via db, zodat de CI-run geen echte mail stuurt).
    await db.markeerVerzonden(id, {
      toegewezen_aan: RK,
      monteur_naam: "E2E Monteur",
      startdatum: "2026-06-20",
      starttijd: null,
    });
    expect((await statusVan(id))?.dashboard_status).toBe("gepland");

    // 4. MONTEUR ziet de verstuurde klus in zijn werkpool en bevestigt via de ECHTE UI.
    await pageM.goto("/");
    const kaart = pageM.locator(`a[href="/opdracht/${id}"]`);
    await expect(kaart).toBeVisible({ timeout: 15_000 });
    await expect(kaart.getByText("Te bevestigen")).toBeVisible();
    await pageM.goto(`/opdracht/${id}`);
    await pageM.getByRole("button", { name: "Ontvangst bevestigen" }).click();
    await expect
      .poll(async () => (await statusVan(id))?.dashboard_status, { timeout: 10_000, intervals: [400] })
      .toBe("bevestigd");
    await expect(pageM.getByText("Ontvangst bevestigd")).toBeVisible();

    // 5. MONTEUR levert op: oplever-concept (foto/handtekening-UI is opleveren.spec; hier via db).
    await db.upsertOpleveringConcept({
      opdracht_id: id,
      eindstaat_foto_urls: [
        `https://test.supabase.co/storage/v1/object/public/oplever/foto-${id}.png`,
      ],
      video_url: null,
      opmerking: "Keuken netjes opgeleverd",
      interne_opmerking: null,
      klant_rapport_email: null,
      handtekening_url: `https://x/htk-${id}.png`,
      rapport_email: null,
      user_id: RK,
    });

    // 6. Zaak-versie versturen (via db) -> opdracht op 'opgeleverd'.
    await db.registreerZaakRapport(id, `https://x/opdracht-documenten/${id}.pdf`);
    expect((await statusVan(id))?.opdracht_status).toBe("opgeleverd");

    // 7. KANTOOR ziet het resultaat op het dashboard: het opleverrapport-blok is nu zichtbaar.
    await pageK.goto(`/dashboard/opdracht/${id}`);
    await expect(pageK.getByText(klant)).toBeVisible();
    await expect(pageK.getByRole("heading", { name: "Opleverrapport" })).toBeVisible();
  } finally {
    await ctxK.close();
    await ctxM.close();
  }
});
