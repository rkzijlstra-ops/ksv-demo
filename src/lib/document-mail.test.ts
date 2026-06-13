import { describe, it, expect } from "vitest";
import { nieuwDocumentTekst } from "./document-mail";

describe("nieuwDocumentTekst", () => {
  it("noemt de klant en meldt het nieuwe document, zonder herbevestiging", () => {
    const { subject, text } = nieuwDocumentTekst("Piet", "Fam. Bakker", "7588", "Keukenstudio Voorschoten");
    expect(subject).toBe("Nieuw document bij je klus: Fam. Bakker");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/nieuw document/i);
    expect(text).toContain("7588");
    expect(text).toMatch(/blijft ongewijzigd/i);
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("laat de referentie weg als die er niet is en valt terug op een neutrale afsluiter", () => {
    const { text } = nieuwDocumentTekst("Piet", "Fam. Bakker", null, "");
    expect(text).not.toMatch(/ref /);
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
