import { describe, it, expect } from "vitest";
import {
  documentSoort,
  documentMeta,
  documentGroep,
  type DocumentSoort,
} from "./document-weergave";

describe("documentSoort", () => {
  it("herkent de soorten uit de echte bestandsnamen", () => {
    expect(documentSoort("Definitieve orderbon Comm Velde 166.pdf")).toBe("orderbon");
    expect(documentSoort("Definitief Bovenaanzicht Comm Velde 166.pdf")).toBe("bovenaanzicht");
    expect(documentSoort("Definitief Leidingschema Comm Bavel 172.pdf")).toBe("leidingschema");
    expect(documentSoort("7637-Offerte afdruk Particulier.pdf")).toBe("offerte");
    expect(documentSoort("klmont-7444 (1).pdf")).toBe("werkbon");
  });
  it("herkent een afbeelding op extensie en op type", () => {
    expect(documentSoort("foto-keuken.jpg")).toBe("afbeelding");
    expect(documentSoort("wat dan ook", "afbeelding")).toBe("afbeelding");
  });
  it("valt terug op overig bij onbekend", () => {
    expect(documentSoort("notitie.pdf")).toBe("overig");
    expect(documentSoort(null)).toBe("overig");
  });
});

describe("documentMeta", () => {
  it("geeft voor elke soort een label + iconKey", () => {
    const soorten: DocumentSoort[] = [
      "orderbon", "bovenaanzicht", "leidingschema", "tekening", "offerte", "werkbon", "afbeelding", "overig",
    ];
    for (const s of soorten) {
      const m = documentMeta(s);
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.iconKey.length).toBeGreaterThan(0);
    }
  });
  it("markeert tekeningen als tekening=true", () => {
    expect(documentMeta("leidingschema").tekening).toBe(true);
    expect(documentMeta("orderbon").tekening).toBe(false);
  });
});

describe("documentGroep", () => {
  it("groepeert tekeningen samen, orderbon apart, rest overig", () => {
    expect(documentGroep("orderbon")).toBe("orderbon");
    expect(documentGroep("bovenaanzicht")).toBe("tekeningen");
    expect(documentGroep("leidingschema")).toBe("tekeningen");
    expect(documentGroep("offerte")).toBe("overig");
    expect(documentGroep("afbeelding")).toBe("overig");
  });
});
