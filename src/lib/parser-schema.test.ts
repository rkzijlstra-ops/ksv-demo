import { describe, it, expect } from "vitest";
import { ParsedPdfSchema, type ParsedPdf } from "./parser-schema";

const fullValid: ParsedPdf = {
  klant_naam: "J. Jansen",
  klant_adres: "Hoofdstraat 12, 1234 AB Voorschoten",
  referentienummer: "7444",
  adviseur: "M. de Vries",
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
      meldingen: [],
    };
    expect(() => ParsedPdfSchema.parse(minimal)).not.toThrow();
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
