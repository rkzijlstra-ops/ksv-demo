import { describe, it, expect } from "vitest";
import { berekenSchaal } from "./foto-compress";

describe("berekenSchaal", () => {
  it("schaalt een liggende foto naar maxZijde op de breedte", () => {
    expect(berekenSchaal(4000, 3000, 1500)).toEqual({ width: 1500, height: 1125 });
  });

  it("schaalt een staande foto naar maxZijde op de hoogte", () => {
    expect(berekenSchaal(3000, 4000, 1500)).toEqual({ width: 1125, height: 1500 });
  });

  it("laat een kleine foto ongemoeid (geen vergroting)", () => {
    expect(berekenSchaal(800, 600, 1500)).toEqual({ width: 800, height: 600 });
  });

  it("rondt af op hele pixels", () => {
    const r = berekenSchaal(1000, 333, 500);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
    expect(r.width).toBe(500);
  });

  it("vierkante foto schaalt gelijk", () => {
    expect(berekenSchaal(2000, 2000, 1500)).toEqual({ width: 1500, height: 1500 });
  });
});
