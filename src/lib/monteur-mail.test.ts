import { describe, it, expect } from "vitest";
import { monteurMailTekst, type MailbareOpdracht } from "./monteur-mail";

function o(over: Partial<MailbareOpdracht> = {}): MailbareOpdracht {
  return {
    klant_naam: over.klant_naam ?? "Fam. Bakker",
    klant_adres: over.klant_adres ?? "Hoofdstraat 12, Voorschoten",
    referentienummer: over.referentienummer ?? "7588",
    documenttype: over.documenttype ?? "orderbevestiging",
    startdatum: over.startdatum ?? "2026-06-10",
    starttijd: over.starttijd ?? null,
    duur_dagen: over.duur_dagen ?? 2,
    meldingen: over.meldingen ?? [],
  };
}

describe("monteurMailTekst", () => {
  it("onderwerp en aanhef voor één opdracht noemen klant en monteur", () => {
    const { subject, text } = monteurMailTekst("Rein", [o({ klant_naam: "Fam. Bakker" })]);
    expect(subject).toBe("Opdracht voor Rein: Fam. Bakker");
    expect(text).toContain("Hoi Rein,");
    expect(text).toContain("Klant: Fam. Bakker");
    expect(text).toContain("Referentie: 7588");
  });

  it("onderwerp telt bij meerdere opdrachten", () => {
    const { subject } = monteurMailTekst("Dani", [o(), o({ klant_naam: "Mevr. de Wit" })]);
    expect(subject).toBe("2 opdrachten voor Dani");
  });

  it("montage (dagblok) toont duur, service toont tijd", () => {
    const montage = monteurMailTekst("Rein", [o({ starttijd: null, duur_dagen: 2 })]).text;
    expect(montage).toContain("vanaf 10 jun (2 dagen)");
    expect(montage).toContain("Type: Montage");

    const service = monteurMailTekst("Rein", [
      o({ documenttype: "werkbon_service", starttijd: "10:00" }),
    ]).text;
    expect(service).toContain("om 10:00");
    expect(service).toContain("Type: Service");
  });

  it("neemt meldingteksten mee", () => {
    const { text } = monteurMailTekst("Rein", [
      o({
        documenttype: "werkbon_service",
        meldingen: [
          { keller_code: "X", omschrijving: "Kraan", melding_tekst: "Lekkage mengkraan" },
        ],
      }),
    ]);
    expect(text).toContain("Melding: Lekkage mengkraan");
  });
});
