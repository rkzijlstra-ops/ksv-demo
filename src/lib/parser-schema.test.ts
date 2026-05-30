import { describe, it, expect } from "vitest";
import { ParsedPdfSchema, type ParsedPdf } from "./parser-schema";

const fullValid: ParsedPdf = {
  klant_naam: "J. Jansen",
  klant_adres: "Hoofdstraat 12, 1234 AB Voorschoten",
  referentienummer: "7444",
  adviseur: "M. de Vries",
  klant_telefoon: "071-1234567",
  documenttype: "werkbon_service",
  leverweek: null,
  keukenzaak: "Keukenstudio Voorschoten",
  meldingen: [
    {
      keller_code: "F-BK-LD-60",
      omschrijving: "Front bovenkast linksdraaiend 60cm",
      melding_tekst: "Beschadigd bij ontvangst, deuk in zijkant",
    },
    {
      keller_code: "GR-RVS-90",
      omschrijving: "Greep RVS 90mm",
      melding_tekst: "Krom, nabestellen",
    },
  ],
};

describe("ParsedPdfSchema", () => {
  it("valideert een compleet object", () => {
    expect(() => ParsedPdfSchema.parse(fullValid)).not.toThrow();
  });

  it("accepteert null voor optionele klant-velden", () => {
    const minimal = {
      klant_naam: null,
      klant_adres: null,
      referentienummer: null,
      adviseur: null,
      klant_telefoon: null,
      documenttype: "onbekend",
      leverweek: null,
      keukenzaak: null,
      meldingen: [],
    };
    expect(() => ParsedPdfSchema.parse(minimal)).not.toThrow();
  });

  it("accepteert een orderbevestiging met leverweek en lege meldingen", () => {
    const order = {
      ...fullValid,
      documenttype: "orderbevestiging",
      leverweek: "22/2026",
      meldingen: [],
    };
    const parsed = ParsedPdfSchema.parse(order);
    expect(parsed.documenttype).toBe("orderbevestiging");
    expect(parsed.leverweek).toBe("22/2026");
    expect(parsed.meldingen).toEqual([]);
  });

  it("accepteert leverweek als string of null", () => {
    expect(ParsedPdfSchema.parse({ ...fullValid, leverweek: null }).leverweek).toBeNull();
    expect(ParsedPdfSchema.parse({ ...fullValid, leverweek: "16/2026" }).leverweek).toBe("16/2026");
  });

  it("verwerpt een onbekende documenttype-waarde", () => {
    const invalid = { ...fullValid, documenttype: "factuur" };
    expect(() => ParsedPdfSchema.parse(invalid)).toThrow(/documenttype/);
  });

  it("verwerpt object zonder documenttype-veld", () => {
    const { documenttype: _ignored, ...withoutType } = fullValid;
    expect(() => ParsedPdfSchema.parse(withoutType)).toThrow(/documenttype/);
  });

  it("accepteert keukenzaak als string of null", () => {
    expect(ParsedPdfSchema.parse({ ...fullValid, keukenzaak: null }).keukenzaak).toBeNull();
    expect(
      ParsedPdfSchema.parse({ ...fullValid, keukenzaak: "Keukensale.com Katwijk" }).keukenzaak,
    ).toBe("Keukensale.com Katwijk");
  });

  it("accepteert klant_telefoon als string of null", () => {
    expect(ParsedPdfSchema.parse({ ...fullValid, klant_telefoon: null }).klant_telefoon).toBeNull();
    expect(
      ParsedPdfSchema.parse({ ...fullValid, klant_telefoon: "06-12345678" }).klant_telefoon,
    ).toBe("06-12345678");
  });

  it("accepteert een lege meldingen-array", () => {
    const parsed = ParsedPdfSchema.parse({ ...fullValid, meldingen: [] });
    expect(parsed.meldingen).toEqual([]);
  });

  it("verwerpt verkeerd type voor referentienummer (number i.p.v. string)", () => {
    const invalid = { ...fullValid, referentienummer: 7444 };
    expect(() => ParsedPdfSchema.parse(invalid)).toThrow(/referentienummer/);
  });

  it("verwerpt melding zonder keller_code", () => {
    const invalid = {
      ...fullValid,
      meldingen: [{ omschrijving: "x", melding_tekst: "y" }],
    };
    expect(() => ParsedPdfSchema.parse(invalid)).toThrow();
  });

  it("verwerpt object zonder meldingen-veld", () => {
    const { meldingen: _ignored, ...withoutMeldingen } = fullValid;
    expect(() => ParsedPdfSchema.parse(withoutMeldingen)).toThrow(/meldingen/);
  });
});
