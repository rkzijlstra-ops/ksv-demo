import { describe, it, expect } from "vitest";
import { normaliseerNlMobiel } from "./telefoon";

describe("normaliseerNlMobiel", () => {
  it("maakt van 06-nummers +31", () => {
    expect(normaliseerNlMobiel("06-12345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("0612345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("06 12 34 56 78")).toBe("+31612345678");
  });

  it("accepteert al-internationale invoer", () => {
    expect(normaliseerNlMobiel("+31612345678")).toBe("+31612345678");
    expect(normaliseerNlMobiel("0031612345678")).toBe("+31612345678");
  });

  it("weigert vaste nummers en onzin", () => {
    expect(normaliseerNlMobiel("071-1234567")).toBeNull(); // vast, geen 06
    expect(normaliseerNlMobiel("0612345")).toBeNull(); // te kort
    expect(normaliseerNlMobiel("hallo")).toBeNull();
    expect(normaliseerNlMobiel(null)).toBeNull();
    expect(normaliseerNlMobiel("")).toBeNull();
  });
});
