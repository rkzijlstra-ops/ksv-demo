import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, OP_ZIJSPOOR } from "../e2e/test-env";
import { INT_PREFIX, getIntZaakId, ruimIntDataOp } from "./int-harnas";

/**
 * FASE 5 — integratie-wipe is gescoped. Bewijst tegen de echte test-DB dat de opruiming van het
 * integratie-harnas (ruimIntDataOp) ALLEEN de eigen integratiedata wist: een klus onder de INT-zaak
 * met INT-prefix gaat weg, maar een handmatige keuring-klus onder een ANDERE opdrachtgever met een
 * gewone naam blijft staan. De oude brede wipe (`meldingen.delete().not("id","is",null)`) zou diezelfde
 * keuring-klus wél hebben gewist; dat is precies het risico dat hier afgedekt wordt.
 *
 * Draait alleen op het test-zijspoor (.env.test); zonder zijspoor wordt de suite overgeslagen zodat we
 * nooit per ongeluk de productie-DB raken. Ruimt zijn eigen rijen netjes op.
 */

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

// Unieke stamp per run zodat namen nooit botsen met andere (handmatige of CI-)data.
const STAMP = `intwipe-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let intZaakId: string;
let standaardZaakId: string | null = null;
let intId: string | null = null;
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

describe.skipIf(!OP_ZIJSPOOR)("FASE 5: integratie-wipe raakt keuringsdata van een andere zaak niet", () => {
  beforeAll(async () => {
    intZaakId = await getIntZaakId(admin);
    standaardZaakId = (await db.getStandaardOpdrachtgever())?.id ?? null;
    if (!standaardZaakId || standaardZaakId === intZaakId) {
      throw new Error(
        "Standaard-zaak ontbreekt of valt samen met de INT-zaak; test-DB niet juist geseed (draai 6a/6e).",
      );
    }
    // INT-klus: onder de INT-zaak met INT-prefix -> moet door de wipe weg.
    intId = await maakKlus(`${INT_PREFIX}${STAMP}`, intZaakId);
    // Keuring-klus: ANDERE opdrachtgever (de standaard-zaak), gewone naam zonder prefix -> moet blijven.
    keuringId = await maakKlus(`Keuring Reinier ${STAMP}`, standaardZaakId);
  });

  afterAll(async () => {
    // Eigen testdata altijd opruimen, ook als een assert faalde (INT-klus is doorgaans al weg).
    for (const id of [intId, keuringId]) {
      if (id) await admin.from("meldingen").delete().eq("id", id).then(() => {}, () => {});
    }
  });

  it("verwijdert de INT-klus maar laat een keuring-klus onder een andere zaak staan", async () => {
    // Vooraf: beide bestaan.
    expect((await db.getOpdrachtById(intId!))?.klant_naam).toBe(`${INT_PREFIX}${STAMP}`);
    expect((await db.getOpdrachtById(keuringId!))?.klant_naam).toBe(`Keuring Reinier ${STAMP}`);

    // De echte, gescopte opruim-logica draaien.
    await ruimIntDataOp(admin, intZaakId);

    // INT-klus is weg; keuring-klus (andere zaak, geen prefix) staat er nog.
    expect(await db.getOpdrachtById(intId!)).toBeNull();
    const keuring = await db.getOpdrachtById(keuringId!);
    expect(keuring).not.toBeNull();
    expect(keuring?.klant_naam).toBe(`Keuring Reinier ${STAMP}`);
  });
});
