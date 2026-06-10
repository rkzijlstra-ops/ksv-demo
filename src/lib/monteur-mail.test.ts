import { describe, it, expect } from "vitest";
import { monteurMailTekst, historieVoorMonteur, type MailbareOpdracht } from "./monteur-mail";

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
    historie: over.historie,
    verzet: over.verzet,
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

  it("een verzetting krijgt een gewijzigd-onderwerp en wijzig-toon i.p.v. 'opdracht klaar'", () => {
    const { subject, text } = monteurMailTekst("Rein", [o({ klant_naam: "Fam. Bakker", verzet: true })]);
    expect(subject).toBe("Gewijzigde afspraak voor Rein: Fam. Bakker");
    expect(text).toMatch(/afspraak is gewijzigd/i);
    expect(text).not.toMatch(/Er staat een opdracht voor je klaar/);
    expect(text).toContain("Klant: Fam. Bakker");
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

  it("sluit af met de meegegeven zaaknaam", () => {
    const { text } = monteurMailTekst("Rein", [o()], "Keukenstudio Voorschoten");
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("valt terug op een neutrale afsluiter zonder zaaknaam", () => {
    expect(monteurMailTekst("Rein", [o()], "").text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });

  it("zet eerdere bezoeken met rapport-link in de mail", () => {
    const { text } = monteurMailTekst("Rein", [
      o({ historie: [{ datum: "2026-05-01", rapportUrl: "https://x/oud.pdf", monteurNaam: "Jan" }] }),
    ]);
    expect(text).toContain("Deze keuken is eerder bezocht");
    expect(text).toContain("https://x/oud.pdf");
    expect(text).toContain("Jan");
  });
});

describe("historieVoorMonteur", () => {
  it("pakt opgeleverde klussen met rapport, zonder de huidige opdracht", () => {
    const rijen = [
      { id: "self", opgeleverd_at: null, startdatum: "2026-06-10", rapport_url: "https://x/r.pdf", monteur_naam: "A" },
      { id: "oud1", opgeleverd_at: "2026-05-01", startdatum: "2026-04-30", rapport_url: "https://x/oud.pdf", monteur_naam: "Jan" },
      { id: "geenrapport", opgeleverd_at: "2026-05-02", startdatum: null, rapport_url: null, monteur_naam: "Piet" },
    ];
    const items = historieVoorMonteur(rijen, "self");
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ datum: "2026-05-01", rapportUrl: "https://x/oud.pdf", monteurNaam: "Jan" });
  });
});
