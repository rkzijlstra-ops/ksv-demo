import { describe, it, expect } from "vitest";
import { voegSamen, voegMeldingenSamen, andereReferentie } from "./order-samenvoegen";

describe("voegSamen", () => {
  it("vult lege velden vanuit de parse", () => {
    const r = voegSamen({ klant_naam: null }, { klant_naam: "Jan", klant_adres: "Dorpsstraat 14" });
    expect(r.velden.klant_naam).toBe("Jan");
    expect(r.velden.klant_adres).toBe("Dorpsstraat 14");
    expect(r.botsingen).toEqual([]);
  });

  it("laat gevulde velden die kloppen met rust (case/spaties genegeerd)", () => {
    const r = voegSamen({ klant_adres: "Dorpsstraat 14" }, { klant_adres: " dorpsstraat 14 " });
    expect(r.velden.klant_adres).toBe("Dorpsstraat 14");
    expect(r.botsingen).toEqual([]);
  });

  it("overschrijft nooit, maar meldt een botsing bij verschil", () => {
    const r = voegSamen(
      { klant_adres: "Dorpsstraat 14" },
      { klant_adres: "Kerkstraat 9" },
    );
    expect(r.velden.klant_adres).toBe("Dorpsstraat 14"); // bestaand blijft
    expect(r.botsingen).toEqual([
      { veld: "klant_adres", bestaand: "Dorpsstraat 14", nieuw: "Kerkstraat 9" },
    ]);
  });

  it("negeert lege parse-waarden (houdt bestaand)", () => {
    const r = voegSamen({ klant_naam: "Jan" }, { klant_naam: null, referentienummer: "" });
    expect(r.velden.klant_naam).toBe("Jan");
    expect(r.botsingen).toEqual([]);
  });

  it("raakt de werkomschrijving niet aan (zit niet in de samenvoeg-velden)", () => {
    const r = voegSamen(
      { klant_naam: "Jan", werkomschrijving: "mailtekst" } as Record<string, string>,
      { klant_naam: "Jan", werkomschrijving: "iets anders" } as Record<string, string>,
    );
    expect((r.velden as Record<string, string>).werkomschrijving).toBeUndefined();
  });
});

describe("voegMeldingenSamen", () => {
  it("vult aan, vervangt niet", () => {
    expect(voegMeldingenSamen([{ a: 1 }], [{ a: 2 }])).toEqual([{ a: 1 }, { a: 2 }]);
  });
  it("gaat om met ontbrekende arrays", () => {
    expect(voegMeldingenSamen(undefined as unknown as object[], [{ a: 2 }])).toEqual([{ a: 2 }]);
  });
});

describe("andereReferentie", () => {
  it("true bij twee verschillende niet-lege refs", () => {
    expect(andereReferentie("0481", "0492")).toBe(true);
  });
  it("false bij gelijke ref", () => {
    expect(andereReferentie("0481", " 0481 ")).toBe(false);
  });
  it("false als één van beide leeg is", () => {
    expect(andereReferentie(null, "0492")).toBe(false);
    expect(andereReferentie("0481", "")).toBe(false);
  });
});
