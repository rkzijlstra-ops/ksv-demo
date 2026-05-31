import { describe, it, expect } from "vitest";
import { clampPercent, uploadPercent } from "./voortgang";

describe("clampPercent", () => {
  it("begrenst tussen 0 en 100 en rondt af", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(33.6)).toBe(34);
  });
  it("geeft 0 bij niet-eindige waarden", () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(100);
  });
});

describe("uploadPercent", () => {
  it("berekent percentage uit bytes", () => {
    expect(uploadPercent(50, 200)).toBe(25);
    expect(uploadPercent(200, 200)).toBe(100);
  });
  it("geeft 0 als totaal onbekend is", () => {
    expect(uploadPercent(10, 0)).toBe(0);
  });
});
