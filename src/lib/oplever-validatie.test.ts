import { describe, it, expect } from "vitest";
import { controleerOplevering } from "./oplever-validatie";

describe("controleerOplevering", () => {
  it("met foto: bewijs aanwezig, geen waarschuwing, mag versturen", () => {
    const c = controleerOplevering({ fotoCount: 2, heeftVideo: false });
    expect(c.heeftBewijs).toBe(true);
    expect(c.magVersturen).toBe(true);
    expect(c.waarschuwing).toBeNull();
  });

  it("video telt ook als bewijs", () => {
    const c = controleerOplevering({ fotoCount: 0, heeftVideo: true });
    expect(c.heeftBewijs).toBe(true);
    expect(c.waarschuwing).toBeNull();
  });

  it("geen bewijs: mag toch versturen (zacht) met waarschuwing", () => {
    const c = controleerOplevering({ fotoCount: 0, heeftVideo: false });
    expect(c.heeftBewijs).toBe(false);
    expect(c.magVersturen).toBe(true);
    expect(c.waarschuwing).toMatch(/foto of video/i);
  });
});
