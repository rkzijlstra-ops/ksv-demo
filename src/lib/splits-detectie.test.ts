import { describe, it, expect } from "vitest";
import { detecteerMeerdereKlanten, type KopMetIndex } from "@/lib/splits-detectie";

function kop(naam: string | null, adres: string | null, pdfIndex: number): KopMetIndex {
  return { klant_naam: naam, klant_adres: adres, referentienummer: null, pdfIndex };
}

describe("detecteerMeerdereKlanten", () => {
  it("vermoedt meerdere bij twee verschillende klanten", () => {
    const r = detecteerMeerdereKlanten([
      kop("Jansen", "Dorpsstraat 12", 0),
      kop("De Vries", "Molenweg 8", 1),
    ]);
    expect(r.vermoeden).toBe(true);
    expect(r.groepen).toHaveLength(2);
    expect(r.reden).toContain("2 verschillende klanten");
  });

  it("vermoedt niets bij dezelfde klant-kern (titel/tussenvoegsel-variant)", () => {
    const r = detecteerMeerdereKlanten([
      kop("T van Bavel", "Kerkstraat 1", 0),
      kop("De familie T van Bavel", "Kerkstraat 1", 1),
    ]);
    expect(r.vermoeden).toBe(false);
    expect(r.groepen).toHaveLength(1);
  });

  it("vermoedt niets bij één kop", () => {
    const r = detecteerMeerdereKlanten([kop("Jansen", "Dorpsstraat 12", 0)]);
    expect(r.vermoeden).toBe(false);
  });

  it("valt terug op het adres als een naam ontbreekt", () => {
    const r = detecteerMeerdereKlanten([
      kop(null, "Dorpsstraat 12", 0),
      kop(null, "Molenweg 8", 1),
    ]);
    expect(r.vermoeden).toBe(true);
    expect(r.groepen).toHaveLength(2);
  });
});
