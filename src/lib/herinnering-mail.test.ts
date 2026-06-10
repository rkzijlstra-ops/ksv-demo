import { describe, it, expect } from "vitest";
import { herinneringTekst } from "./herinnering-mail";

describe("herinneringTekst", () => {
  it("noemt bij één klus de klant in onderwerp en tekst", () => {
    const { subject, text } = herinneringTekst("Piet", ["Fam. Bakker"], "Keukenstudio Voorschoten");
    expect(subject).toBe("Herinnering: bevestig je opdracht voor Fam. Bakker");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/nog niet bevestigd/i);
    expect(text).toContain("Fam. Bakker");
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("somt bij meerdere klussen het aantal en de namen op", () => {
    const { subject, text } = herinneringTekst("Piet", ["Bakker", "Jansen", "de Vries"], "");
    expect(subject).toBe("Herinnering: bevestig je 3 opdrachten");
    expect(text).toContain("3 opdrachten nog niet bevestigd");
    expect(text).toContain("- Bakker");
    expect(text).toContain("- de Vries");
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
