import { describe, it, expect } from "vitest";
import {
  maakItems,
  voegToe,
  markeerBezig,
  markeerKlaar,
  markeerMislukt,
  opnieuw,
  verwijderItem,
  aantalKlaar,
  aantalTotaal,
  ietsBezig,
  heeftMislukte,
  eersteWachtende,
  klaarUrls,
  type UploadItem,
} from "./foto-upload-queue";

describe("foto-upload-queue", () => {
  it("maakt wachtende items van ids", () => {
    const items = maakItems(["a", "b"]);
    expect(items).toEqual([
      { id: "a", status: "wachten" },
      { id: "b", status: "wachten" },
    ]);
  });

  it("voegt nieuwe items achteraan toe zonder bestaande te raken", () => {
    const items = voegToe(maakItems(["a"]), ["b", "c"]);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(items.every((i) => i.status === "wachten")).toBe(true);
  });

  it("markeert een item bezig, klaar (met url) en mislukt (met fout)", () => {
    let items = maakItems(["a", "b"]);
    items = markeerBezig(items, "a");
    expect(items.find((i) => i.id === "a")?.status).toBe("bezig");

    items = markeerKlaar(items, "a", "https://x/a.jpg");
    const a = items.find((i) => i.id === "a");
    expect(a?.status).toBe("klaar");
    expect(a?.url).toBe("https://x/a.jpg");

    items = markeerMislukt(items, "b", "Upload mislukt");
    const b = items.find((i) => i.id === "b");
    expect(b?.status).toBe("mislukt");
    expect(b?.fout).toBe("Upload mislukt");
  });

  it("opnieuw zet een mislukt item terug op wachten en wist de fout", () => {
    let items = markeerMislukt(maakItems(["a"]), "a", "boem");
    items = opnieuw(items, "a");
    const a = items.find((i) => i.id === "a");
    expect(a?.status).toBe("wachten");
    expect(a?.fout).toBeUndefined();
  });

  it("verwijdert een item uit de lijst", () => {
    const items = verwijderItem(maakItems(["a", "b"]), "a");
    expect(items.map((i) => i.id)).toEqual(["b"]);
  });

  it("muteert de invoer niet (immutable)", () => {
    const start = maakItems(["a"]);
    markeerBezig(start, "a");
    expect(start[0].status).toBe("wachten");
  });

  it("telt klaar en totaal", () => {
    let items = maakItems(["a", "b", "c"]);
    items = markeerKlaar(items, "a", "u1");
    items = markeerKlaar(items, "b", "u2");
    expect(aantalKlaar(items)).toBe(2);
    expect(aantalTotaal(items)).toBe(3);
  });

  it("ietsBezig is waar zolang er een wachtend of bezig item is", () => {
    let items = maakItems(["a"]);
    expect(ietsBezig(items)).toBe(true); // wachten telt mee
    items = markeerBezig(items, "a");
    expect(ietsBezig(items)).toBe(true);
    items = markeerKlaar(items, "a", "u");
    expect(ietsBezig(items)).toBe(false);
  });

  it("een mislukt item telt niet als bezig, wel als mislukt", () => {
    const items = markeerMislukt(maakItems(["a"]), "a", "x");
    expect(ietsBezig(items)).toBe(false);
    expect(heeftMislukte(items)).toBe(true);
  });

  it("eersteWachtende geeft het eerste wachtende item, anders undefined", () => {
    let items = maakItems(["a", "b"]);
    items = markeerBezig(items, "a");
    expect(eersteWachtende(items)?.id).toBe("b");
    items = markeerKlaar(items, "b", "u");
    items = markeerKlaar(items, "a", "u2");
    expect(eersteWachtende(items)).toBeUndefined();
  });

  it("klaarUrls geeft de urls van klaar-items in volgorde", () => {
    let items: UploadItem[] = maakItems(["a", "b", "c"]);
    items = markeerKlaar(items, "a", "u-a");
    items = markeerMislukt(items, "b", "x");
    items = markeerKlaar(items, "c", "u-c");
    expect(klaarUrls(items)).toEqual(["u-a", "u-c"]);
  });
});
