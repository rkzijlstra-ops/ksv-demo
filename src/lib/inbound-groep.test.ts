import { describe, it, expect } from "vitest";
import { groepeerInboundOrder, type InboundKopItem } from "./inbound-groep";

const k = (
  referentienummer: string | null,
  klant_naam: string | null = null,
  klant_adres: string | null = null,
): InboundKopItem => ({ referentienummer, klant_naam, klant_adres });

describe("groepeerInboundOrder", () => {
  it("één PDF blijft één klus", () => {
    const g = groepeerInboundOrder([k("192813", "Durand")]);
    expect(g).toHaveLength(1);
    expect(g[0].indexen).toEqual([0]);
    expect(g[0].referentienummer).toBe("192813");
    expect(g[0].kopIndex).toBe(0);
  });

  it("twee PDF's met hetzelfde ref worden één klus", () => {
    const g = groepeerInboundOrder([k("192813", "Durand"), k("192813")]);
    expect(g).toHaveLength(1);
    expect(g[0].indexen).toEqual([0, 1]);
  });

  it("order zonder ref + leidingadvies mét ref worden ÉÉN klus (geen lege splitsing)", () => {
    // De order-PDF ('B.A.') parseerde leeg (ref null); het leidingadvies had ref + klantdata.
    const g = groepeerInboundOrder([k(null), k("192813", "Durand", "Marshalllaan 2")]);
    expect(g).toHaveLength(1);
    expect(g[0].indexen).toEqual([0, 1]);
    expect(g[0].referentienummer).toBe("192813");
    // De meest complete kop (met ref + klant) wordt de kop van de klus.
    expect(g[0].kopIndex).toBe(1);
  });

  it("twee lege PDF's blijven één klus; de kop met klantnaam wint", () => {
    const g = groepeerInboundOrder([k(null), k(null, "Fam. Jansen")]);
    expect(g).toHaveLength(1);
    expect(g[0].referentienummer).toBeNull();
    expect(g[0].kopIndex).toBe(1);
  });

  it("twee verschillende refs blijven aparte klussen", () => {
    const g = groepeerInboundOrder([k("A1", "Klant A"), k("B2", "Klant B")]);
    expect(g).toHaveLength(2);
    expect(g[0].referentienummer).toBe("A1");
    expect(g[1].referentienummer).toBe("B2");
  });

  it("zelfde ref twee keer + losse zonder ref => één klus met alle drie", () => {
    const g = groepeerInboundOrder([k("A1"), k("A1", "Klant A"), k(null)]);
    expect(g).toHaveLength(1);
    expect(g[0].indexen).toEqual([0, 1, 2]);
    expect(g[0].kopIndex).toBe(1);
  });

  it("meerdere refs + een loze PDF: de loze hangt bij de eerste groep (nooit een lege klus)", () => {
    const g = groepeerInboundOrder([k("A1", "Klant A"), k("B2", "Klant B"), k(null)]);
    expect(g).toHaveLength(2);
    expect(g[0].indexen).toEqual([0, 2]); // loze PDF bij eerste keuken
    expect(g[1].indexen).toEqual([1]);
  });

  it("lege string-ref telt als geen ref", () => {
    const g = groepeerInboundOrder([k("  "), k("192813", "Durand")]);
    expect(g).toHaveLength(1);
    expect(g[0].referentienummer).toBe("192813");
  });
});
