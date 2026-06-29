import { describe, it, expect } from "vitest";
import { uitnodigingTekst } from "./uitnodig-mail";

describe("uitnodigingTekst", () => {
  it("noemt naam, rol en de login-URL", () => {
    const { subject, text } = uitnodigingTekst("Piet", "monteur", "https://ksv-demo.vercel.app");
    expect(subject).toBe("Je bent toegevoegd aan de planning-app");
    expect(text).toContain("Hoi Piet,");
    expect(text).toContain("als monteur");
    expect(text).toContain("https://ksv-demo.vercel.app/login");
  });

  it("toont de juiste rol voor een opdrachtgever", () => {
    expect(uitnodigingTekst("Ed", "opdrachtgever", "https://x").text).toContain("als opdrachtgever");
  });

  it("sluit af met de organisatienaam en niet met BKM", () => {
    const { text } = uitnodigingTekst(
      "Piet",
      "monteur",
      "https://x",
      "Keukenstudio Voorschoten",
    );
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
    expect(text).not.toContain("BKM");
  });

  it("valt terug op een neutrale afsluiter als er geen organisatie is", () => {
    const { text } = uitnodigingTekst("Piet", "monteur", "https://x", "");
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });

  it("zet de zaaknaam vooraan in onderwerp en tekst als er een organisatie is", () => {
    const { subject, text } = uitnodigingTekst(
      "Thu",
      "monteur",
      "https://x",
      "Keukenstudio Voorschoten",
    );
    // Onderwerp begint met de herkenbare zaaknaam (de ontvanger kent Kluslus niet).
    expect(subject).toBe("Keukenstudio Voorschoten heeft je toegevoegd aan de planning-app");
    // De opening noemt de zaak die uitnodigt, niet een kale "je bent toegevoegd".
    expect(text).toContain("Keukenstudio Voorschoten heeft je toegevoegd");
    // Eén zin legt uit wat Kluslus is, zodat de naam in de afzender niet vaag overkomt.
    expect(text).toContain("Kluslus");
    expect(text).toContain("als monteur");
  });

  it("houdt het neutrale onderwerp zonder organisatie", () => {
    const { subject } = uitnodigingTekst("Piet", "monteur", "https://x", "");
    expect(subject).toBe("Je bent toegevoegd aan de planning-app");
  });
});
