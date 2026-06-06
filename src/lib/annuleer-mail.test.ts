import { describe, it, expect } from "vitest";
import { annuleringTekst } from "./annuleer-mail";

describe("annuleringTekst", () => {
  it("noemt de klant en meldt dat de opdracht geannuleerd is", () => {
    const { subject, text } = annuleringTekst("Piet", "Fam. Bakker", "7588", "Keukenstudio Voorschoten");
    expect(subject).toBe("Opdracht geannuleerd: Fam. Bakker");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/geannuleerd/i);
    expect(text).toContain("7588");
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("laat de referentie weg als die er niet is, en valt terug op een neutrale afsluiter", () => {
    const { text } = annuleringTekst("Piet", "Fam. Bakker", null, "");
    expect(text).not.toMatch(/ref /);
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
