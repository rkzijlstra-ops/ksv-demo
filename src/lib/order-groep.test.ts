import { describe, it, expect } from "vitest";
import { refKern, naamKern, eersteNietLeeg, groepeerDocumenten, voegOrderSamen } from "./order-groep";
import type { ParsedPdf } from "./parser-schema";

describe("refKern", () => {
  it("haalt de cijferkern eruit zodat 166 en SP166 samenvallen", () => {
    expect(refKern("166")).toBe("166");
    expect(refKern("SP166")).toBe("166");
    expect(refKern(" 7444 ")).toBe("7444");
    expect(refKern("166-A")).toBe("166");
  });
  it("null bij geen cijfers/leeg", () => {
    expect(refKern(null)).toBeNull();
    expect(refKern("")).toBeNull();
    expect(refKern("ABC")).toBeNull();
  });
});

describe("naamKern", () => {
  it("normaliseert titels en initialen weg", () => {
    expect(naamKern("T van der Velde")).toBe("vandervelde");
    expect(naamKern("Mevrouw T van der Velde")).toBe("vandervelde");
    expect(naamKern("Fam Bavel")).toBe("bavel");
  });
  it("null bij leeg of te kort", () => {
    expect(naamKern(null)).toBeNull();
    expect(naamKern("")).toBeNull();
    expect(naamKern("A.")).toBeNull();
  });
});

describe("eersteNietLeeg", () => {
  it("geeft de eerste niet-lege waarde", () => {
    expect(eersteNietLeeg(null, "", "x", "y")).toBe("x");
    expect(eersteNietLeeg(null, undefined, null)).toBeNull();
    expect(eersteNietLeeg("  ", "echt")).toBe("echt");
  });
});

describe("groepeerDocumenten", () => {
  it("groepeert twee klussen, brugt via ref EN naam, en houdt een los bestand apart", () => {
    const docs = [
      { index: 0, referentienummer: null, klant_naam: "T van der Velde" }, // tekening velde (naam)
      { index: 1, referentienummer: "SP166", klant_naam: "Vd Velde" }, // leidingschema velde (ref bridge)
      { index: 2, referentienummer: "166", klant_naam: "Mevrouw T van der Velde" }, // orderbon velde
      { index: 3, referentienummer: null, klant_naam: "Bavel" },
      { index: 4, referentienummer: "SP172", klant_naam: "Bavel" },
      { index: 5, referentienummer: "172", klant_naam: "Fam Bavel" },
      { index: 6, referentienummer: null, klant_naam: null }, // geen identiteit
    ];
    const { groepen, ongegroepeerd } = groepeerDocumenten(docs);
    expect(ongegroepeerd).toEqual([6]);
    const setjes = groepen.map((g) => [...g].sort((a, b) => a - b));
    expect(setjes).toContainEqual([0, 1, 2]);
    expect(setjes).toContainEqual([3, 4, 5]);
    expect(groepen).toHaveLength(2);
  });

  it("één klus bij één document met identiteit", () => {
    const { groepen, ongegroepeerd } = groepeerDocumenten([
      { index: 0, referentienummer: "166", klant_naam: "van der Velde" },
    ]);
    expect(groepen).toEqual([[0]]);
    expect(ongegroepeerd).toEqual([]);
  });
});

function pp(over: Partial<ParsedPdf>): ParsedPdf {
  return {
    klant_naam: null, klant_adres: null, referentienummer: null, adviseur: null,
    klant_telefoon: null, klant_email: null, documenttype: "onbekend", leverweek: null,
    keukenzaak: null, meldingen: [], adressen: [], ...over,
  };
}

describe("voegOrderSamen", () => {
  it("neemt per veld de eerste niet-lege waarde over de documenten", () => {
    const tekening = pp({ klant_naam: "T van der Velde", documenttype: "onbekend" });
    const orderbon = pp({ referentienummer: "166", klant_telefoon: "0628572148", documenttype: "orderbevestiging" });
    const samen = voegOrderSamen([tekening, orderbon]);
    expect(samen.klant_naam).toBe("T van der Velde");
    expect(samen.referentienummer).toBe("166");
    expect(samen.klant_telefoon).toBe("0628572148");
    expect(samen.documenttype).toBe("orderbevestiging"); // order wint van onbekend
  });
});
