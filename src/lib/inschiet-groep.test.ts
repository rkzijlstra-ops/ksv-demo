import { describe, it, expect } from "vitest";
import { groepeerOpRef, type InschietItem } from "./inschiet-groep";

function i(referentienummer: string | null): InschietItem {
  return { referentienummer };
}

describe("groepeerOpRef", () => {
  it("voegt PDF's met hetzelfde referentienummer samen tot één opdracht", () => {
    const groepen = groepeerOpRef([i("7444"), i("7444")]);
    expect(groepen).toHaveLength(1);
    expect(groepen[0].referentienummer).toBe("7444");
    expect(groepen[0].indexen).toEqual([0, 1]);
    expect(groepen[0].aandacht).toBe(false);
  });

  it("maakt aparte opdrachten voor verschillende referentienummers", () => {
    const groepen = groepeerOpRef([i("7444"), i("7588")]);
    expect(groepen.map((g) => g.referentienummer)).toEqual(["7444", "7588"]);
    expect(groepen.every((g) => g.indexen.length === 1)).toBe(true);
  });

  it("maakt elke PDF zonder referentienummer een eigen, gemarkeerde opdracht", () => {
    const groepen = groepeerOpRef([i(null), i(null)]);
    expect(groepen).toHaveLength(2);
    expect(groepen.every((g) => g.aandacht && g.referentienummer === null)).toBe(true);
    expect(groepen.map((g) => g.indexen)).toEqual([[0], [1]]);
  });

  it("behandelt een mix: groepeert refs, laat ref-loze los", () => {
    const groepen = groepeerOpRef([i("7444"), i(null), i("7444"), i("7588")]);
    expect(groepen).toHaveLength(3);
    const ref7444 = groepen.find((g) => g.referentienummer === "7444");
    expect(ref7444?.indexen).toEqual([0, 2]);
    expect(groepen.filter((g) => g.aandacht)).toHaveLength(1);
  });

  it("behoudt de vololgorde van eerste voorkomen", () => {
    const groepen = groepeerOpRef([i("7588"), i("7444"), i("7588")]);
    expect(groepen.map((g) => g.referentienummer)).toEqual(["7588", "7444"]);
  });

  it("geeft een lege array bij geen items", () => {
    expect(groepeerOpRef([])).toEqual([]);
  });
});
