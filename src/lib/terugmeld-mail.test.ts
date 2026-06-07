import { describe, it, expect } from "vitest";
import { terugmeldingTekst, redenLabel } from "./terugmeld-mail";

describe("terugmeldingTekst", () => {
  it("noemt de monteur, klant, reden en toelichting", () => {
    const { subject, text } = terugmeldingTekst(
      "Piet", "Fam. Bakker", "7588", "klant_niet_thuis", "3x aangebeld", "Keukenstudio Voorschoten",
    );
    expect(subject).toContain("Fam. Bakker");
    expect(text).toContain("Piet");
    expect(text).toContain("Klant niet thuis");
    expect(text).toContain("3x aangebeld");
    expect(text).toContain("7588");
    expect(text.trimEnd().endsWith("Keukenstudio Voorschoten")).toBe(true);
  });

  it("laat de toelichting en referentie weg als die er niet zijn", () => {
    const { text } = terugmeldingTekst("Piet", "Fam. Bakker", null, "werk_niet_afgerond", null, "");
    expect(text).not.toMatch(/Toelichting/);
    expect(text).not.toMatch(/ref /);
    expect(text).toContain("Werk niet af te ronden");
    expect(text.trimEnd().endsWith("Het planning-team")).toBe(true);
  });
});

describe("redenLabel", () => {
  it("mapt bekende redenen, valt terug op de ruwe waarde", () => {
    expect(redenLabel("klant_niet_thuis")).toBe("Klant niet thuis");
    expect(redenLabel("werk_niet_afgerond")).toBe("Werk niet af te ronden");
    expect(redenLabel("iets_onbekends")).toBe("iets_onbekends");
  });
});
