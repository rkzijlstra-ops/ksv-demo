import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "../e2e/test-env";

// Integratie tegen de zijspoor-test-DB: de query en idempotentie van de bevestig-herinnering.
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

const M = "00000000-0000-4000-8000-0000000000a1";
const SEED_USER = BEHEERDER.uid;
// Ruime cutoff in de toekomst: een zojuist verstuurde klus valt er sowieso onder, zo testen we de
// selectie zonder met timestamps te knoeien.
const RUIME_CUTOFF = "2999-01-01T00:00:00.000Z";
let zaakId: string;

async function wipe() {
  await admin.from("opleveringen").delete().not("id", "is", null);
  await admin.from("documenten").delete().not("id", "is", null);
  await admin.from("meldingen").delete().not("id", "is", null);
}

async function verstuurdeKlus(klant: string): Promise<string> {
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: SEED_USER,
    opdrachtgever_id: zaakId,
  });
  await db.planOpdracht(id, {
    toegewezen_aan: M,
    monteur_naam: "Piet",
    startdatum: "2026-06-16",
    starttijd: null,
    duur_dagen: 1,
  });
  await db.markeerVerzonden(id, {
    toegewezen_aan: M,
    monteur_naam: "Piet",
    startdatum: "2026-06-16",
    starttijd: null,
  });
  return id;
}

beforeAll(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  if (!zaak) throw new Error("Geen zaak gevonden; draai de 6a/6e-migraties eerst.");
  zaakId = zaak.id;
});

beforeEach(wipe);
afterAll(wipe);

describe("bevestig-herinnering: selectie en idempotentie", () => {
  it("selecteert een verstuurde, onbevestigde klus en stuurt niet twee keer", async () => {
    const id = await verstuurdeKlus("Herinner mij");

    const eerste = await db.getKlussenVoorHerinnering(RUIME_CUTOFF);
    expect(eerste.map((k) => k.id)).toContain(id);

    await db.markeerHerinneringVerzonden([id]);

    const tweede = await db.getKlussenVoorHerinnering(RUIME_CUTOFF);
    expect(tweede.map((k) => k.id)).not.toContain(id);
  });

  it("een bevestigde klus krijgt geen herinnering", async () => {
    const id = await verstuurdeKlus("Al bevestigd");
    await db.bevestigOntvangst(id);

    const klussen = await db.getKlussenVoorHerinnering(RUIME_CUTOFF);
    expect(klussen.map((k) => k.id)).not.toContain(id);
  });

  it("een nog niet verstuurde klus (concept) krijgt geen herinnering", async () => {
    const { id } = await db.createOpdracht({
      documenttype: "orderbevestiging",
      klant_naam: "Nog concept",
      klant_adres: "Teststraat 2",
      referentienummer: null,
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      keukenzaak: "Keukenstudio Voorschoten",
      user_id: SEED_USER,
      opdrachtgever_id: zaakId,
    });
    await db.planOpdracht(id, {
      toegewezen_aan: M,
      monteur_naam: "Piet",
      startdatum: "2026-06-16",
      starttijd: null,
      duur_dagen: 1,
    });
    const klussen = await db.getKlussenVoorHerinnering(RUIME_CUTOFF);
    expect(klussen.map((k) => k.id)).not.toContain(id);
  });
});
