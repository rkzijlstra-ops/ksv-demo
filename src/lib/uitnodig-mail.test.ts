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
});
