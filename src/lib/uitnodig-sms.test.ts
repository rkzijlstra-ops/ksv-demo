import { describe, it, expect } from "vitest";
import { uitnodigingSmsTekst } from "./uitnodig-sms";

describe("uitnodigingSmsTekst", () => {
  it("noemt naam, zaaknaam, Kluslus en de login-URL", () => {
    const t = uitnodigingSmsTekst("Thu", "Keukenstudio Voorschoten", "https://mijn.kluslus.nl");
    expect(t).toContain("Thu");
    expect(t).toContain("Keukenstudio Voorschoten");
    expect(t).toContain("Kluslus");
    expect(t).toContain("https://mijn.kluslus.nl/login");
  });

  it("noemt de spam-map zodat de mail-vangnet duidelijk is", () => {
    const t = uitnodigingSmsTekst("Thu", "KSV", "https://x");
    expect(t.toLowerCase()).toContain("spam");
  });

  it("laat geen dubbele schuine streep ontstaan bij een trailing slash in de URL", () => {
    const t = uitnodigingSmsTekst("Thu", "KSV", "https://x/");
    expect(t).toContain("https://x/login");
    expect(t).not.toContain("https://x//login");
  });

  it("valt terug op een neutrale zaaknaam als die ontbreekt", () => {
    const t = uitnodigingSmsTekst("Thu", "", "https://x");
    expect(t).toContain("Het planning-team");
  });
});
