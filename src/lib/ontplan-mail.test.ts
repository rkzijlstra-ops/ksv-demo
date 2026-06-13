import { describe, it, expect } from "vitest";
import { ontplanningTekst } from "./ontplan-mail";

describe("ontplanningTekst", () => {
  it("noemt de klant en meldt dat de opdracht van de planning is gehaald", () => {
    const { subject, text } = ontplanningTekst("Piet", "Fam. Bakker", "7588", "Keukenstudio Voorschoten");
    expect(subject).toBe("Klus van je planning gehaald: Fam. Bakker");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/van je planning gehaald/i);
    expect(text).toContain("7588");
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("zegt dat de klus mogelijk opnieuw wordt ingepland (anders dan annuleren)", () => {
    const { text } = ontplanningTekst("Piet", "Fam. Bakker", "7588", "");
    expect(text).toMatch(/opnieuw/i);
    expect(text).not.toMatch(/geannuleerd/i);
  });

  it("laat de referentie weg als die er niet is, en valt terug op een neutrale afsluiter", () => {
    const { text } = ontplanningTekst("Piet", "Fam. Bakker", null, "");
    expect(text).not.toMatch(/ref /);
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
