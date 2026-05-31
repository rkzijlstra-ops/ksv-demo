import { describe, it, expect } from "vitest";
import { normaliseerNummerNL, whatsappUrl } from "./whatsapp";

describe("normaliseerNummerNL", () => {
  it("zet 06-nummer om naar internationaal", () => {
    expect(normaliseerNummerNL("06-12345678")).toBe("31612345678");
    expect(normaliseerNummerNL("0612345678")).toBe("31612345678");
  });
  it("verwerkt +31 en 0031", () => {
    expect(normaliseerNummerNL("+31 6 12345678")).toBe("31612345678");
    expect(normaliseerNummerNL("0031612345678")).toBe("31612345678");
  });
  it("laat een al-internationaal nummer staan", () => {
    expect(normaliseerNummerNL("31612345678")).toBe("31612345678");
  });
  it("pakt het eerste nummer bij meerdere", () => {
    expect(normaliseerNummerNL("06-39111157 / 06-20161649")).toBe("31639111157");
  });
  it("geeft null bij onbruikbaar of leeg", () => {
    expect(normaliseerNummerNL("")).toBeNull();
    expect(normaliseerNummerNL(null)).toBeNull();
    expect(normaliseerNummerNL("123")).toBeNull();
  });
});

describe("whatsappUrl", () => {
  it("bouwt een wa.me-link met vooringevuld bericht", () => {
    expect(whatsappUrl("06-12345678", "Hallo")).toBe("https://wa.me/31612345678?text=Hallo");
  });
  it("zonder tekst alleen de basis-URL", () => {
    expect(whatsappUrl("0612345678")).toBe("https://wa.me/31612345678");
  });
  it("null bij onbruikbaar nummer", () => {
    expect(whatsappUrl("geen")).toBeNull();
  });
});
