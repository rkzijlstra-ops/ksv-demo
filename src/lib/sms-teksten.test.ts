import { describe, it, expect } from "vitest";
import {
  nieuweOpdrachtenSmsTekst,
  annuleringSmsTekst,
  ontplanningSmsTekst,
  nieuwDocumentSmsTekst,
  herinneringSmsTekst,
} from "./sms-teksten";
import type { MailbareOpdracht } from "./monteur-mail";

function o(over: Partial<MailbareOpdracht> = {}): MailbareOpdracht {
  return {
    klant_naam: over.klant_naam ?? "Fam. Bakker",
    klant_adres: over.klant_adres ?? null,
    referentienummer: over.referentienummer ?? "7588",
    documenttype: over.documenttype ?? "orderbevestiging",
    startdatum: over.startdatum ?? "2026-06-10",
    starttijd: over.starttijd ?? null,
    duur_dagen: over.duur_dagen ?? 1,
    meldingen: over.meldingen ?? [],
    historie: over.historie,
    verzet: over.verzet,
  };
}

const APP = "ksv.app";

describe("nieuweOpdrachtenSmsTekst", () => {
  it("een klus: noemt klant, datum en app-link, onder 160 tekens, plat", () => {
    const t = nieuweOpdrachtenSmsTekst("Piet", [o({ klant_naam: "Fam. Bakker" })], APP);
    expect(t).toContain("Piet");
    expect(t).toContain("Fam. Bakker");
    expect(t).toContain("10 jun");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
    expect(t).not.toMatch(/[^\x00-\x7F]/); // alleen ASCII (geen accenten)
  });

  it("meerdere klussen: telt en verwijst naar de app", () => {
    const t = nieuweOpdrachtenSmsTekst("Piet", [o(), o()], APP);
    expect(t).toContain("2");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("een verzetting krijgt een verzet-toon i.p.v. 'nieuwe klus'", () => {
    const t = nieuweOpdrachtenSmsTekst("Piet", [o({ klant_naam: "Fam. Bakker", verzet: true })], APP);
    expect(t).toMatch(/verzet naar/i);
    expect(t).not.toMatch(/nieuwe klus/i);
    expect(t).toContain("Fam. Bakker");
    expect(t.length).toBeLessThanOrEqual(160);
  });
});

describe("losse meldingen", () => {
  it("annulering noemt klant en referentie", () => {
    const t = annuleringSmsTekst("Piet", "Fam. Bakker", "7588", APP);
    expect(t).toContain("geannuleerd");
    expect(t).toContain("Fam. Bakker");
    expect(t).toContain("7588");
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("ontplanning meldt dat de klus is weggehaald", () => {
    const t = ontplanningSmsTekst("Piet", "Fam. Bakker", "7588");
    expect(t).toContain("Fam. Bakker");
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("nieuw document verwijst naar de app", () => {
    const t = nieuwDocumentSmsTekst("Piet", "Fam. Bakker", "7588", APP);
    expect(t).toContain("document");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });

  it("herinnering bundelt klantnamen", () => {
    const t = herinneringSmsTekst("Piet", ["Fam. Bakker"], APP);
    expect(t).toContain("bevestig");
    expect(t).toContain(APP);
    expect(t.length).toBeLessThanOrEqual(160);
  });
});
