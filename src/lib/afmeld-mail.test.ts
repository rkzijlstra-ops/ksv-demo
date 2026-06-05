import { describe, it, expect } from "vitest";
import { afmeldingTekst } from "./afmeld-mail";

describe("afmeldingTekst", () => {
  it("noemt de naam en meldt dat de toegang vervalt", () => {
    const { subject, text } = afmeldingTekst("Piet", "Keukenstudio Voorschoten");
    expect(subject).toBe("Je bent afgemeld bij de planning-app");
    expect(text).toContain("Hoi Piet,");
    expect(text).toMatch(/geen toegang/i);
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("valt terug op een neutrale afsluiter zonder organisatie", () => {
    expect(afmeldingTekst("Piet", "").text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});
