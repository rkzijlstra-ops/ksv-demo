import { describe, it, expect } from "vitest";
import { domeinVanAdres, isEersteVerzendingNaarDomein, isEersteContactMetDomein } from "./verzend-domein";

describe("domeinVanAdres", () => {
  it("haalt het domein eruit, lowercase en getrimd", () => {
    expect(domeinVanAdres("  Servicemonteur@Keukensale.COM ")).toBe("keukensale.com");
  });
  it("geeft null zonder @ of zonder domein", () => {
    expect(domeinVanAdres("geenadres")).toBeNull();
    expect(domeinVanAdres("piet@")).toBeNull();
    expect(domeinVanAdres(null)).toBeNull();
  });
});

describe("isEersteVerzendingNaarDomein", () => {
  it("true als er nog nooit naar dat domein is gestuurd", () => {
    expect(isEersteVerzendingNaarDomein("x@keukensale.com", [])).toBe(true);
    expect(isEersteVerzendingNaarDomein("x@keukensale.com", ["y@anders.nl"])).toBe(true);
  });
  it("false als er al naar hetzelfde domein is gestuurd (ander postvak telt mee)", () => {
    expect(isEersteVerzendingNaarDomein("nieuw@keukensale.com", ["servicemonteur@keukensale.com"])).toBe(false);
  });
  it("vergelijkt hoofdletter-ongevoelig", () => {
    expect(isEersteVerzendingNaarDomein("x@KEUKENSALE.com", ["y@keukensale.COM"])).toBe(false);
  });
  it("false (geen waarschuwing) bij een ongeldig doeladres", () => {
    expect(isEersteVerzendingNaarDomein("geenadres", [])).toBe(false);
  });
});

describe("isEersteContactMetDomein", () => {
  it("true als alleen deze klus dat domein heeft gemaild (ook bij herverzending)", () => {
    expect(
      isEersteContactMetDomein("klus-1", [{ opdracht_id: "klus-1" }, { opdracht_id: "klus-1" }]),
    ).toBe(true);
  });
  it("false als een andere klus dat domein ook heeft gemaild", () => {
    expect(
      isEersteContactMetDomein("klus-1", [{ opdracht_id: "klus-1" }, { opdracht_id: "klus-2" }]),
    ).toBe(false);
  });
  it("false bij lege lijst", () => {
    expect(isEersteContactMetDomein("klus-1", [])).toBe(false);
  });
});
