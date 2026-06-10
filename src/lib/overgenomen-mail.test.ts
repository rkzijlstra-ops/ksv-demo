import { describe, it, expect } from "vitest";
import { overgenomenTekst } from "./overgenomen-mail";

describe("overgenomenTekst", () => {
  it("meldt neutraal dat de klus niet meer van de monteur is, zonder wie hem overneemt", () => {
    const { subject, text } = overgenomenTekst("Piet", "Fam. Bakker", "7588", "Keukenstudio Voorschoten");
    expect(subject).toBe("Opdracht niet meer voor jou: Fam. Bakker");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/niet meer aan jou toegewezen/i);
    expect(text).toContain("7588");
    expect(text).not.toMatch(/geannuleerd/i);
    expect(text).not.toMatch(/opnieuw/i);
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("laat de referentie weg als die er niet is en valt terug op een neutrale afsluiter", () => {
    const { text } = overgenomenTekst("Piet", "Fam. Bakker", null, "");
    expect(text).not.toMatch(/ref /);
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
