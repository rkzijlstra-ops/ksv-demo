import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { ruimE2eKlussenOp, E2E_KLUS_PREFIXEN } from "../e2e/global-teardown";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, OP_ZIJSPOOR } from "../e2e/test-env";

/**
 * FASE 5 — data-isolatie. Bewijst dat de e2e-teardown (ruimE2eKlussenOp) handmatige keuringsdata met
 * rust laat: alleen klussen met een vaste e2e-prefix worden gewist, een keuring-klus met een gewone naam
 * blijft staan. Draait alleen op het test-zijspoor (.env.test); zonder zijspoor wordt de suite overgeslagen
 * zodat we nooit per ongeluk de productie-DB raken. Ruimt zijn eigen rijen netjes op.
 */

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

// Unieke stamp per run zodat namen nooit botsen met andere (handmatige of CI-)data.
const STAMP = `iso-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let zaakId: string | null = null;
let e2eId: string | null = null;
let keuringId: string | null = null;

async function maakKlus(klant_naam: string, opdrachtgever_id: string | null): Promise<string> {
  const { id } = await db.createOpdracht({
    documenttype: "orderbevestiging",
    klant_naam,
    klant_adres: "Teststraat 1",
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER.uid,
    opdrachtgever_id,
  });
  return id;
}

describe.skipIf(!OP_ZIJSPOOR)("FASE 5: teardown laat handmatige keuringsdata met rust", () => {
  beforeAll(async () => {
    zaakId = (await db.getStandaardOpdrachtgever())?.id ?? null;
    // E2e-klus: naam met vaste prefix -> moet door de teardown weg.
    e2eId = await maakKlus(`E2E ${STAMP}`, zaakId);
    // Keuring-klus: naam ZONDER e2e-prefix, in een eigen scope (ad-hoc, geen zaak) -> moet blijven.
    keuringId = await maakKlus(`Keuring Reinier ${STAMP}`, null);
  });

  afterAll(async () => {
    // Eigen testdata altijd opruimen, ook als een assert faalde.
    for (const id of [e2eId, keuringId]) {
      if (id) await admin.from("meldingen").delete().eq("id", id).then(() => {}, () => {});
    }
  });

  it("de testprefix 'E2E %' staat echt in de opruimlijst", () => {
    expect(E2E_KLUS_PREFIXEN).toContain("E2E %");
  });

  it("verwijdert de e2e-klus maar laat de keuring-klus staan", async () => {
    // Vooraf: beide bestaan.
    expect((await db.getOpdrachtById(e2eId!))?.klant_naam).toBe(`E2E ${STAMP}`);
    expect((await db.getOpdrachtById(keuringId!))?.klant_naam).toBe(`Keuring Reinier ${STAMP}`);

    // De echte teardown-logica draaien.
    await ruimE2eKlussenOp(admin);

    // E2e-klus is weg; keuring-klus (geen prefix) staat er nog.
    expect(await db.getOpdrachtById(e2eId!)).toBeNull();
    const keuring = await db.getOpdrachtById(keuringId!);
    expect(keuring).not.toBeNull();
    expect(keuring?.klant_naam).toBe(`Keuring Reinier ${STAMP}`);
  });
});
