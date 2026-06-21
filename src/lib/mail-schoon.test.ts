import { describe, it, expect } from "vitest";
import { schoonOmschrijving } from "./mail-schoon";

describe("schoonOmschrijving", () => {
  it("houdt een gewone korte boodschap intact", () => {
    expect(schoonOmschrijving("De lade onder de oven is kapot.")).toBe("De lade onder de oven is kapot.");
  });

  it("knipt een handtekening eraf (Met vriendelijke groet)", () => {
    const t = "De kraan lekt.\n\nMet vriendelijke groet,\nJan Jansen\n0612345678";
    expect(schoonOmschrijving(t)).toBe("De kraan lekt.");
  });

  it("knipt 'Verzonden vanaf mijn iPhone' eraf", () => {
    const t = "Graag een afspraak inplannen.\n\nVerzonden vanaf mijn iPhone";
    expect(schoonOmschrijving(t)).toBe("Graag een afspraak inplannen.");
  });

  it("verwijdert geciteerde reactie-historie (> regels)", () => {
    const t = "Hier de gegevens.\n\n> Op 1 jan schreef iemand:\n> oude tekst\n> meer oude tekst";
    expect(schoonOmschrijving(t)).toBe("Hier de gegevens.");
  });

  it("knipt vanaf 'Op <datum> schreef' het citaat-blok eraf", () => {
    const t = "Zie onder.\n\nOp 1 januari 2026 om 10:00 schreef Klant <k@x.nl>:\nlange oude mail hieronder";
    expect(schoonOmschrijving(t)).toBe("Zie onder.");
  });

  it("knipt een doorgestuurd-blok (Van:/Verzonden:/Aan:) eraf", () => {
    const t = "Doorgestuurd ter info.\n\nVan: Klant\nVerzonden: maandag\nAan: ons\nOnderwerp: keuken\n\noude inhoud";
    expect(schoonOmschrijving(t)).toBe("Doorgestuurd ter info.");
  });

  it("verwijdert de '-- ' handtekening-scheiding", () => {
    const t = "Korte vraag.\n\n-- \nBedrijf BV\nwww.bedrijf.nl";
    expect(schoonOmschrijving(t)).toBe("Korte vraag.");
  });

  it("geeft null bij lege of alleen-ruis invoer", () => {
    expect(schoonOmschrijving("")).toBeNull();
    expect(schoonOmschrijving(null)).toBeNull();
    expect(schoonOmschrijving("\n\n  \n")).toBeNull();
    expect(schoonOmschrijving("Met vriendelijke groet,\nJan")).toBeNull();
  });

  it("comprimeert overtollige lege regels", () => {
    expect(schoonOmschrijving("Regel een.\n\n\n\nRegel twee.")).toBe("Regel een.\n\nRegel twee.");
  });
});
