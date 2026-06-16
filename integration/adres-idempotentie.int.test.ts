import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER } from "../e2e/test-env";

// Integratie tegen de zijspoor-test-DB: het datamodel van blok 20 (adres-keuze) en de
// inbound-idempotentie. Test de echte kolommen/constraints, niet een mock.
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

let zaakId: string | null = null;
const gemaakteOpdrachten: string[] = [];
const gemaakteMails: string[] = [];

beforeAll(async () => {
  zaakId = (await db.getStandaardOpdrachtgever())?.id ?? null;
});

afterAll(async () => {
  for (const id of gemaakteOpdrachten) await admin.from("meldingen").delete().eq("id", id);
  for (const eid of gemaakteMails) await admin.from("inbound_verwerkt").delete().eq("email_id", eid);
});

describe("adres-keuze datamodel (blok 20)", () => {
  it("bewaart adres_kandidaten + keuze-vlag en kiesAdres maakt het af", async () => {
    const kandidaten = [
      { adres: "Lange Akker 5, 2161 JK Lisse", soort: "montage" as const },
      { adres: "Ambachtsweg 7, 2222 AH Katwijk", soort: "opdrachtgever" as const },
    ];
    const { id } = await db.createOpdracht({
      documenttype: "orderbevestiging",
      klant_naam: `ADRES ${Date.now()}`,
      klant_adres: null,
      referentienummer: null,
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      keukenzaak: "Keukensale.com Katwijk",
      user_id: BEHEERDER.uid,
      opdrachtgever_id: zaakId,
      adres_kandidaten: kandidaten,
      adres_keuze_nodig: true,
    });
    gemaakteOpdrachten.push(id);

    const voor = await db.getOpdrachtById(id);
    expect(voor?.adres_keuze_nodig).toBe(true);
    expect(voor?.klant_adres).toBeNull();
    expect(voor?.adres_kandidaten).toHaveLength(2);
    expect(voor?.adres_kandidaten?.[0]).toMatchObject({ adres: kandidaten[0].adres, soort: "montage" });

    await db.kiesAdres(id, "Lange Akker 5, 2161 JK Lisse");

    const na = await db.getOpdrachtById(id);
    expect(na?.klant_adres).toBe("Lange Akker 5, 2161 JK Lisse");
    expect(na?.adres_keuze_nodig).toBe(false);
  });
});

describe("inbound-idempotentie", () => {
  it("markeert een mail één keer; een herhaling wordt overgeslagen", async () => {
    const eid = `int-${Date.now()}-${BEHEERDER.uid.slice(0, 6)}`;
    gemaakteMails.push(eid);

    expect(await db.markeerInboundVerwerkt(eid)).toBe(true); // eerste keer
    expect(await db.markeerInboundVerwerkt(eid)).toBe(false); // zelfde mail opnieuw -> overslaan
  });
});
