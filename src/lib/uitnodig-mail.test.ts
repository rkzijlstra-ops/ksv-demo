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
});
