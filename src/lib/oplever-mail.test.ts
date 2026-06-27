import { describe, it, expect } from "vitest";
import { opleverMailTekst, afzenderHeader, bouwWhatsappTekst } from "./oplever-mail";

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

  it("tekent met de persoonsnaam, witregel, dan de bedrijfs- en contactregel (geen dubbele naam)", () => {
    const { text, afzenderNaam } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender,
      heeftVideo: false,
    });
    // Afzendernaam bovenaan de mail blijft het bedrijf; de ondertekening tekent met de persoon.
    expect(afzenderNaam).toBe("BKM Keukenmontage");
    expect(text).toContain(
      "Met vriendelijke groet,\nJan Bakker\n\nBKM Keukenmontage  ·  0612345678  ·  jan@bkm.nl",
    );
    // Geen dubbele bedrijfsnaam direct onder elkaar.
    expect(text).not.toContain("BKM Keukenmontage\nBKM Keukenmontage");
  });

  it("tekent met de bedrijfsnaam als er geen persoonsnaam is, zonder die te herhalen", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender: { naam: null, bedrijfsnaam: "BKM Keukenmontage", telefoon: "0612345678", email: "jan@bkm.nl" },
      heeftVideo: false,
    });
    expect(text).toContain("Met vriendelijke groet,\nBKM Keukenmontage\n\n0612345678  ·  jan@bkm.nl");
    expect(text).not.toContain("BKM Keukenmontage\nBKM Keukenmontage");
  });

  it("valt terug op een neutrale ondertekening zonder profiel", () => {
    const { text, afzenderNaam } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: null,
      afzender: null,
      heeftVideo: false,
    });
    expect(afzenderNaam).toBe("Kluslus");
    expect(text.trimEnd().endsWith("Kluslus")).toBe(true);
  });

  it("noemt de video alleen als er een video is", () => {
    const met = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftVideo: true });
    const zonder = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftVideo: false });
    expect(met.text).toMatch(/video/i);
    expect(zonder.text).not.toMatch(/video/i);
  });

  it("noemt foto's alleen als er foto's zijn, en niets bij geen media", () => {
    const fotos = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftFotos: true, heeftVideo: false });
    const niets = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftFotos: false, heeftVideo: false });
    expect(fotos.text).toMatch(/foto/i);
    expect(fotos.text).not.toMatch(/video/i);
    expect(niets.text).not.toMatch(/foto/i);
    expect(niets.text).not.toMatch(/in het rapport in de bijlage/i);
  });

  it("noemt foto's en video samen als beide er zijn", () => {
    const beide = opleverMailTekst({ klantNaam: "x", referentienummer: null, afzender: null, heeftFotos: true, heeftVideo: true });
    expect(beide.text).toMatch(/foto/i);
    expect(beide.text).toMatch(/video/i);
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

describe("opleverMailTekst — klant heeft het rapport ook (zaak-mail)", () => {
  it("vermeldt in de zaak-mail dat de klant het rapport ook kreeg", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender: null,
      heeftVideo: false,
      doelgroep: "zaak",
      klantOok: { wanneer: "11 juni 2026", adres: "jan@devries.nl" },
    });
    expect(text).toContain("De klant heeft dit rapport ook ontvangen op 11 juni 2026 (jan@devries.nl).");
  });

  it("vermeldt niets als de klant zijn versie nog niet kreeg", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender: null,
      heeftVideo: false,
      doelgroep: "zaak",
      klantOok: null,
    });
    expect(text).not.toContain("De klant heeft dit rapport ook ontvangen");
  });

  it("zet de klant-ook-regel nooit in de klant-mail zelf", () => {
    const { text } = opleverMailTekst({
      klantNaam: "van Dijk",
      referentienummer: "7407",
      afzender: null,
      heeftVideo: false,
      doelgroep: "klant",
      klantOok: { wanneer: "11 juni 2026", adres: "jan@devries.nl" },
    });
    expect(text).not.toContain("De klant heeft dit rapport ook ontvangen");
  });
});

describe("bouwWhatsappTekst", () => {
  it("noemt klant, referentie, planning@kluslus.nl en het spam-verzoek", () => {
    const t = bouwWhatsappTekst({ klantNaam: "Familie Schaddé", referentienummer: "192945" });
    expect(t).toContain("Familie Schaddé");
    expect(t).toContain("ref 192945");
    expect(t).toContain("planning@kluslus.nl");
    expect(t).toMatch(/spam/i);
    expect(t).toMatch(/veilige afzender/i);
  });
  it("werkt zonder klantnaam en zonder referentie", () => {
    const t = bouwWhatsappTekst({ klantNaam: null, referentienummer: null });
    expect(t).toContain("de klant");
    expect(t).not.toContain("ref ");
  });
});
