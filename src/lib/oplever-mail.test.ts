import { describe, it, expect } from "vitest";
import { opleverMailTekst, afzenderHeader } from "./oplever-mail";

const afzender = {
  naam: "Jan Bakker",
  bedrijfsnaam: "BKM Keukenmontage",
  telefoon: "0612345678",
  email: "jan@bkm.nl",
};

describe("opleverMailTekst", () => {
  it("zet klant en referentie in onderwerp en tekst", () => {
    const { subject, text } = opleverMailTekst({
      klantNaam: "De heer en mevrouw H Hoek",
      referentienummer: "192920",
      afzender: null,
      heeftVideo: false,
    });
    expect(subject).toBe("Opleverrapport De heer en mevrouw H Hoek (ref 192920)");
    expect(text).toContain("De heer en mevrouw H Hoek (ref 192920)");
  });

  it("is een nette begeleidende notitie met aanhef en afsluiting", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender,
      heeftVideo: false,
    });
    expect(text.startsWith("Beste,")).toBe(true);
    expect(text).toContain("Met vriendelijke groet,");
  });

  it("ondertekent met de bedrijfsnaam + contactgegevens uit het profiel, niet met de keukenzaak", () => {
    const { text, afzenderNaam } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender,
      heeftVideo: false,
    });
    expect(afzenderNaam).toBe("BKM Keukenmontage");
    expect(text.trimEnd().endsWith("0612345678  ·  jan@bkm.nl")).toBe(true);
    expect(text).toContain("BKM Keukenmontage");
  });

  it("valt terug op een neutrale ondertekening zonder profiel", () => {
    const { text, afzenderNaam } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: null,
      afzender: null,
      heeftVideo: false,
    });
    expect(afzenderNaam).toBe("Keukenmontage");
    expect(text.trimEnd().endsWith("Keukenmontage")).toBe(true);
  });

  it("noemt de video alleen als er een video is", () => {
    const met = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftVideo: true });
    const zonder = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftVideo: false });
    expect(met.text).toMatch(/video/i);
    expect(zonder.text).not.toMatch(/video/i);
  });

  it("bevat geen rauwe link en geen interne opmerking", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender,
      heeftVideo: true,
    });
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toContain("Opmerking");
  });
});

describe("afzenderHeader", () => {
  it("zet de naam voor een kaal adres", () => {
    expect(afzenderHeader("onboarding@resend.dev", "Keukenmontage")).toBe(
      "Keukenmontage <onboarding@resend.dev>",
    );
  });

  it("overschrijft een bestaande weergavenaam maar houdt het adres", () => {
    expect(afzenderHeader("Keukenstudio Voorschoten <planning@kluslus.nl>", "BKM Keukenmontage")).toBe(
      "BKM Keukenmontage <planning@kluslus.nl>",
    );
  });

  it("negeert spaties rond het adres", () => {
    expect(afzenderHeader("  rapport@mijndomein.nl  ", "BKM")).toBe("BKM <rapport@mijndomein.nl>");
  });
});
