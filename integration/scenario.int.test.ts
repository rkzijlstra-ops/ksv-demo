import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { historieVoorMonteur } from "@/lib/monteur-mail";
import { vindDubbeleBoekingen } from "@/lib/planbord";

// ---- creds uit .env.local laden (vitest laadt dit niet automatisch) ----
const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const URL_ = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;

const admin = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

// Zeven "monteurs" (vaste uuids; toegewezen_aan is een losse uuid-kolom, geen account nodig
// voor de data-logica). Namen mogen botsen om bevinding 3 te testen.
const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const MONTEURS = [
  { id: M(1), naam: "Jan" },
  { id: M(2), naam: "Piet" },
  { id: M(3), naam: "Klaas" },
  { id: M(4), naam: "Dani" },
  { id: M(5), naam: "Sam" },
  { id: M(6), naam: "Tom" },
  { id: M(7), naam: "Jan" }, // gelijke naam als M(1), ander account: test bevinding 3
];

const PEIL = new Date("2026-06-15T12:00:00Z");
// Het echte beheerder-account (geseed); meldingen.user_id is NOT NULL en heeft een auth-koppeling.
const SEED_USER = "443dff43-dc74-4216-8173-076f22973245";
let zaakId: string;

async function wipe() {
  await admin.from("opleveringen").delete().not("id", "is", null);
  await admin.from("documenten").delete().not("id", "is", null);
  await admin.from("meldingen").delete().not("id", "is", null);
}

async function maakOpdracht(over: {
  klant?: string;
  ref?: string | null;
  type?: "orderbevestiging" | "werkbon_service";
  zaak?: string | null;
}): Promise<string> {
  const { id } = await db.createOpdracht({
    documenttype: over.type ?? "orderbevestiging",
    klant_naam: over.klant ?? "Testklant",
    klant_adres: "Teststraat 1",
    referentienummer: over.ref ?? null,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: SEED_USER,
    opdrachtgever_id: over.zaak === undefined ? zaakId : over.zaak,
  });
  return id;
}

beforeAll(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  if (!zaak) throw new Error("Geen zaak (opdrachtgever) gevonden; draai de 6a/6e-migraties eerst.");
  zaakId = zaak.id;
});

beforeEach(wipe);
afterAll(wipe);

describe("Volume: 7 monteurs, veel montages over meerdere dagen", () => {
  it("alle kantoor-opdrachten staan op het dashboard; per monteur klopt de werkpool", async () => {
    // 14 montages: 2 per monteur, verspreid over de week.
    const perMonteur: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const monteur = MONTEURS[i % 7];
      const id = await maakOpdracht({ klant: `Klant ${i}`, ref: `R${i}` });
      const dag = `2026-06-${15 + (i % 5)}`; // ma-vr
      await db.planOpdracht(id, {
        toegewezen_aan: monteur.id,
        monteur_naam: monteur.naam,
        startdatum: dag,
        starttijd: null,
        duur_dagen: 1,
      });
      perMonteur[monteur.id] = (perMonteur[monteur.id] ?? 0) + 1;
    }

    const dashboard = await db.getOpdrachtenVoorDashboard(PEIL);
    expect(dashboard).toHaveLength(14);

    // Werkpool van M(1): alleen zijn eigen toegewezen klussen.
    const werkpoolM1 = await db.getWerkpoolVoor(M(1));
    expect(werkpoolM1).toHaveLength(perMonteur[M(1)]);
    expect(werkpoolM1.every((o) => o.toegewezen_aan === M(1))).toBe(true);
  });
});

describe("Zaak-scheiding: ad-hoc (KKS) blijft uit het dashboard", () => {
  it("een ad-hoc opdracht staat in de werkpool van de monteur, niet op het dashboard", async () => {
    const m = MONTEURS[0];
    // Ad-hoc: geen zaak, direct toegewezen aan de monteur (zoals zelf-inschieten).
    const { id } = await db.createOpdracht({
      documenttype: "werkbon_service",
      klant_naam: "KKS klant",
      klant_adres: "Katwijk 1",
      referentienummer: "KKS1",
      adviseur: null,
      klant_telefoon: null,
      leverweek: null,
      keukenzaak: "Katwijk Keukensale",
      user_id: SEED_USER,
      toegewezen_aan: m.id,
      opdrachtgever_id: null,
    });
    // En één kantoor-opdracht (met zaak) op het dashboard.
    const kantoorId = await maakOpdracht({ klant: "KSV klant", ref: "KSV1" });

    const dashboard = await db.getOpdrachtenVoorDashboard(PEIL);
    expect(dashboard.map((o) => o.id)).toContain(kantoorId);
    expect(dashboard.map((o) => o.id)).not.toContain(id);

    const werkpool = await db.getWerkpoolVoor(m.id);
    expect(werkpool.map((o) => o.id)).toContain(id);
  });
});

describe("Verzonden-plek op account (bevinding 3)", () => {
  it("zelfde plek = niet opnieuw versturen; ander account zelfde plek = wel", async () => {
    const a = MONTEURS[0]; // Jan, M(1)
    const b = MONTEURS[6]; // Jan, M(7) - gelijke naam, ander account
    const id = await maakOpdracht({ klant: "Verzonden test", ref: "V1" });
    await db.planOpdracht(id, {
      toegewezen_aan: a.id,
      monteur_naam: a.naam,
      startdatum: "2026-06-16",
      starttijd: "10:00",
      duur_dagen: 1,
    });
    await db.markeerVerzonden(id, {
      toegewezen_aan: a.id,
      monteur_naam: a.naam,
      startdatum: "2026-06-16",
      starttijd: "10:00",
    });

    const naVerzenden = await db.getOpdrachtById(id);
    expect(naVerzenden?.verzonden_toegewezen_aan).toBe(a.id);

    // Verplaats naar exact dezelfde plek (zelfde account/dag/tijd): geen her-verzending nodig.
    await db.wijzigOpdracht(
      id,
      { toegewezen_aan: a.id, monteur_naam: a.naam, startdatum: "2026-06-16", starttijd: "10:00", duur_dagen: 1 },
      "gepland",
      { toegewezen_aan: a.id, monteur_naam: a.naam, startdatum: "2026-06-16", starttijd: "10:00" },
    );
    expect((await db.getOpdrachtById(id))?.gewijzigd_te_versturen).toBe(false);

    // Verplaats naar de gelijknamige andere monteur (ander account), zelfde dag/tijd: wel opnieuw.
    await db.wijzigOpdracht(
      id,
      { toegewezen_aan: b.id, monteur_naam: b.naam, startdatum: "2026-06-16", starttijd: "10:00", duur_dagen: 1 },
      "gepland",
      { toegewezen_aan: a.id, monteur_naam: a.naam, startdatum: "2026-06-16", starttijd: "10:00" },
    );
    expect((await db.getOpdrachtById(id))?.gewijzigd_te_versturen).toBe(true);
  });
});

describe("Annuleren", () => {
  it("een geannuleerde opdracht is niet meer actief op het dashboard", async () => {
    const id = await maakOpdracht({ klant: "Annuleer", ref: "A1" });
    await db.planOpdracht(id, {
      toegewezen_aan: M(1),
      monteur_naam: "Jan",
      startdatum: "2026-06-16",
      starttijd: null,
      duur_dagen: 1,
    });
    await db.annuleerOpdracht(id);
    const o = await db.getOpdrachtById(id);
    expect(o?.dashboard_status).toBe("geannuleerd");
  });
});

describe("Vervolgservice: eerdere rapporten op referentie", () => {
  it("een tweede klus op dezelfde referentie krijgt het rapport van de eerste mee", async () => {
    const ref = "9001";
    const eersteId = await maakOpdracht({ klant: "Keuken X", ref, type: "orderbevestiging" });
    await db.markeerOpgeleverd(eersteId, "https://storage/rapport-9001.pdf");

    const tweedeId = await maakOpdracht({ klant: "Keuken X", ref, type: "werkbon_service" });

    const rijen = await db.zoekOpReferentie(ref);
    const historie = historieVoorMonteur(
      rijen.map((r) => ({
        id: r.id,
        opgeleverd_at: r.opgeleverd_at,
        startdatum: r.startdatum,
        rapport_url: r.rapport_url,
        monteur_naam: r.monteur_naam,
      })),
      tweedeId,
    );
    expect(historie).toHaveLength(1);
    expect(historie[0].rapportUrl).toBe("https://storage/rapport-9001.pdf");
  });
});

describe("Status-flow en ontplannen", () => {
  it("plan -> verstuur -> bevestig, en ontplannen haalt de klus echt uit de werkpool", async () => {
    const m = MONTEURS[2]; // Klaas, M(3)
    const id = await maakOpdracht({ klant: "Flow", ref: "SF1" });
    await db.planOpdracht(id, {
      toegewezen_aan: m.id,
      monteur_naam: m.naam,
      startdatum: "2026-06-16",
      starttijd: null,
      duur_dagen: 1,
    });
    expect((await db.getOpdrachtById(id))?.dashboard_status).toBe("concept_gepland");

    await db.markeerVerzonden(id, {
      toegewezen_aan: m.id,
      monteur_naam: m.naam,
      startdatum: "2026-06-16",
      starttijd: null,
    });
    expect((await db.getOpdrachtById(id))?.dashboard_status).toBe("gepland");

    await db.bevestigOntvangst(id);
    expect((await db.getOpdrachtById(id))?.dashboard_status).toBe("bevestigd");

    // De monteur ziet 'm nu in zijn werkpool.
    expect((await db.getWerkpoolVoor(m.id)).map((o) => o.id)).toContain(id);

    // Ontplannen: terug naar de pool. De monteur mag 'm daarna NIET meer in zijn werkpool zien.
    await db.ontplanOpdracht(id);
    const o = await db.getOpdrachtById(id);
    expect(o?.dashboard_status).toBe("binnen");
    expect(o?.toegewezen_aan).toBeNull();
    expect((await db.getWerkpoolVoor(m.id)).map((x) => x.id)).not.toContain(id);
  });
});

describe("Dubbele-boeking detectie tegen echte data", () => {
  it("twee montages voor dezelfde monteur op dezelfde dag worden als conflict gevonden", async () => {
    const a = await maakOpdracht({ klant: "Dubbel A", ref: "D1" });
    const b = await maakOpdracht({ klant: "Dubbel B", ref: "D2" });
    for (const id of [a, b]) {
      await db.planOpdracht(id, {
        toegewezen_aan: M(2),
        monteur_naam: "Piet",
        startdatum: "2026-06-17",
        starttijd: null,
        duur_dagen: 1,
      });
    }
    const dashboard = await db.getOpdrachtenVoorDashboard(PEIL);
    const conflicten = vindDubbeleBoekingen(dashboard);
    expect(conflicten.has(a)).toBe(true);
    expect(conflicten.has(b)).toBe(true);
  });

  it("twee services zelfde monteur, zelfde dag, andere tijd = GEEN conflict", async () => {
    const a = await maakOpdracht({ klant: "Service 9u", ref: "S1", type: "werkbon_service" });
    const b = await maakOpdracht({ klant: "Service 13u", ref: "S2", type: "werkbon_service" });
    await db.planOpdracht(a, { toegewezen_aan: M(4), monteur_naam: "Dani", startdatum: "2026-06-18", starttijd: "09:00", duur_dagen: 1 });
    await db.planOpdracht(b, { toegewezen_aan: M(4), monteur_naam: "Dani", startdatum: "2026-06-18", starttijd: "13:00", duur_dagen: 1 });
    const conflicten = vindDubbeleBoekingen(await db.getOpdrachtenVoorDashboard(PEIL));
    expect(conflicten.size).toBe(0);
  });
});

describe("Herverdelen tussen monteurs", () => {
  it("verplaatsen naar een andere monteur verhuist de klus tussen de werkpools", async () => {
    const id = await maakOpdracht({ klant: "Herverdeel", ref: "H1" });
    await db.planOpdracht(id, { toegewezen_aan: M(1), monteur_naam: "Jan", startdatum: "2026-06-16", starttijd: null, duur_dagen: 1 });
    expect((await db.getWerkpoolVoor(M(1))).map((o) => o.id)).toContain(id);

    await db.wijzigOpdracht(
      id,
      { toegewezen_aan: M(5), monteur_naam: "Sam", startdatum: "2026-06-16", starttijd: null, duur_dagen: 1 },
      "concept_gepland",
      null,
    );
    expect((await db.getWerkpoolVoor(M(1))).map((o) => o.id)).not.toContain(id);
    expect((await db.getWerkpoolVoor(M(5))).map((o) => o.id)).toContain(id);
  });
});

describe("Soft-delete (prullenbak)", () => {
  it("een verwijderde opdracht verdwijnt uit dashboard en werkpool", async () => {
    const id = await maakOpdracht({ klant: "Weg", ref: "W1" });
    await db.planOpdracht(id, { toegewezen_aan: M(6), monteur_naam: "Tom", startdatum: "2026-06-16", starttijd: null, duur_dagen: 1 });
    await db.verwijderOpdracht(id);
    expect((await db.getOpdrachtenVoorDashboard(PEIL)).map((o) => o.id)).not.toContain(id);
    expect((await db.getWerkpoolVoor(M(6))).map((o) => o.id)).not.toContain(id);
  });
});
