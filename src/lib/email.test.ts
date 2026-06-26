import { describe, it, expect } from "vitest";
import { geldigEmail } from "./email";

describe("geldigEmail", () => {
  it("accepteert een normaal adres", () => {
    expect(geldigEmail("piet@bedrijf.nl")).toBe(true);
  });
  it("trimt spaties", () => {
    expect(geldigEmail("  piet@bedrijf.nl  ")).toBe(true);
  });
  it("weigert leeg/null/undefined", () => {
    expect(geldigEmail("")).toBe(false);
    expect(geldigEmail(null)).toBe(false);
    expect(geldigEmail(undefined)).toBe(false);
  });
  it("weigert zonder @ of zonder domein-punt", () => {
    expect(geldigEmail("pietbedrijf.nl")).toBe(false);
    expect(geldigEmail("piet@bedrijf")).toBe(false);
    expect(geldigEmail("piet@@bedrijf.nl")).toBe(false);
  });
});
