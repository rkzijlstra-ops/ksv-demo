import { describe, it, expect } from "vitest";
import { afgerondMeldingTekst } from "./afgerond-mail";

describe("afgerondMeldingTekst", () => {
  it("zet klantnaam in het onderwerp", () => {
    const { subject } = afgerondMeldingTekst("Jan", "Fam. Jansen", "192920", null, false, "");
    expect(subject).toContain("Fam. Jansen");
  });
  it("noemt 'helemaal voltooid' als er geen vervolg nodig is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", "192920", null, false, "");
    expect(text.toLowerCase()).toContain("helemaal voltooid");
    expect(text).toContain("ref 192920");
  });
  it("noemt het vervolg als vervolgNodig true is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", null, null, true, "");
    expect(text.toLowerCase()).toContain("vervolg");
  });
  it("voegt de toelichting toe als die er is", () => {
    const { text } = afgerondMeldingTekst("Jan", "Fam. Jansen", null, "Alles getest", false, "");
    expect(text).toContain("Alles getest");
  });
});
