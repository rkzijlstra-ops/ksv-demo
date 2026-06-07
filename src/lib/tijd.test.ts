import { describe, it, expect } from "vitest";
import { tijdOpties } from "./tijd";

describe("tijdOpties", () => {
  it("begint op 06:00 en eindigt op 20:00, per 5 minuten", () => {
    const o = tijdOpties();
    expect(o[0]).toBe("06:00");
    expect(o[1]).toBe("06:05");
    expect(o[o.length - 1]).toBe("20:00");
  });

  it("bevat geen tijd na het eindeuur", () => {
    const o = tijdOpties(8, 17);
    expect(o).toContain("17:00");
    expect(o).not.toContain("17:05");
    expect(o[0]).toBe("08:00");
  });

  it("respecteert de stapgrootte", () => {
    const o = tijdOpties(9, 10, 15);
    expect(o).toEqual(["09:00", "09:15", "09:30", "09:45", "10:00"]);
  });
});
