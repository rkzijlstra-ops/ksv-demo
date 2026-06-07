import { describe, it, expect } from "vitest";
import { herinneringCutoff } from "./herinnering";

describe("herinneringCutoff", () => {
  it("trekt het aantal uren van nu af, als ISO", () => {
    const nu = new Date("2026-06-07T12:00:00.000Z");
    expect(herinneringCutoff(nu, 24)).toBe("2026-06-06T12:00:00.000Z");
  });

  it("werkt met een andere drempel", () => {
    const nu = new Date("2026-06-07T12:00:00.000Z");
    expect(herinneringCutoff(nu, 6)).toBe("2026-06-07T06:00:00.000Z");
  });
});
