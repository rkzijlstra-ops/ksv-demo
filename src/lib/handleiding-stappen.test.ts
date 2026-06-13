import { describe, it, expect } from "vitest";
import { HANDLEIDING_STAPPEN } from "./handleiding-stappen";

describe("HANDLEIDING_STAPPEN", () => {
  it("heeft minstens de zes kern-stappen", () => {
    expect(HANDLEIDING_STAPPEN.length).toBeGreaterThanOrEqual(6);
  });

  it("elke stap heeft een titel, punten, route en bestand", () => {
    for (const stap of HANDLEIDING_STAPPEN) {
      expect(stap.titel.trim().length).toBeGreaterThan(0);
      expect(stap.punten.length).toBeGreaterThan(0);
      for (const punt of stap.punten) expect(punt.trim().length).toBeGreaterThan(0);
      expect(stap.route.startsWith("/")).toBe(true);
      expect(stap.bestand).toMatch(/^\d{2}-[a-z0-9-]+\.png$/);
    }
  });

  it("bestandsnamen zijn uniek", () => {
    const namen = HANDLEIDING_STAPPEN.map((s) => s.bestand);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it("routes met een opdracht gebruiken de :id-placeholder", () => {
    const metId = HANDLEIDING_STAPPEN.filter((s) => s.route.includes("/opdracht/"));
    for (const stap of metId) expect(stap.route).toContain(":id");
  });
});
