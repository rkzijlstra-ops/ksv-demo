import { describe, it, expect } from "vitest";
import { controleerOplevering } from "./oplever-validatie";

describe("controleerOplevering", () => {
  it("met foto en gekozen uitkomst: mag versturen, geen waarschuwing", () => {
    const c = controleerOplevering({ fotoCount: 2, heeftVideo: false, uitkomst: "afgerond" });
    expect(c.heeftBewijs).toBe(true);
    expect(c.magVersturen).toBe(true);
    expect(c.waarschuwing).toBeNull();
  });

  it("video telt ook als bewijs", () => {
    const c = controleerOplevering({ fotoCount: 0, heeftVideo: true, uitkomst: "afgerond" });
    expect(c.heeftBewijs).toBe(true);
    expect(c.waarschuwing).toBeNull();
  });

  it("geen bewijs maar uitkomst gekozen: mag versturen (zacht) met waarschuwing", () => {
    const c = controleerOplevering({ fotoCount: 0, heeftVideo: false, uitkomst: "openstaande_punten" });
    expect(c.heeftBewijs).toBe(false);
    expect(c.magVersturen).toBe(true);
    expect(c.waarschuwing).toMatch(/foto of video/i);
  });

  it("geen uitkomst gekozen: mag niet versturen", () => {
    const c = controleerOplevering({ fotoCount: 3, heeftVideo: true, uitkomst: null });
    expect(c.uitkomstGekozen).toBe(false);
    expect(c.magVersturen).toBe(false);
  });
});
