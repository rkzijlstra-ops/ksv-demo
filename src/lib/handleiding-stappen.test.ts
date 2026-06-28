import { describe, it, expect } from "vitest";
import { HANDLEIDING_GROEPEN, HANDLEIDING_ONDERWERPEN } from "./handleiding-stappen";

describe("HANDLEIDING_GROEPEN", () => {
  it("heeft vier groepen, elk met minstens één onderwerp", () => {
    expect(HANDLEIDING_GROEPEN.length).toBe(4);
    for (const groep of HANDLEIDING_GROEPEN) {
      expect(groep.titel.trim().length).toBeGreaterThan(0);
      expect(groep.onderwerpen.length).toBeGreaterThan(0);
    }
  });

  it("HANDLEIDING_ONDERWERPEN is de platte lijst van alle onderwerpen", () => {
    const totaal = HANDLEIDING_GROEPEN.reduce((n, g) => n + g.onderwerpen.length, 0);
    expect(HANDLEIDING_ONDERWERPEN.length).toBe(totaal);
    expect(HANDLEIDING_ONDERWERPEN.length).toBeGreaterThanOrEqual(12);
  });

  it("elk onderwerp heeft id, titel, punten, route en bestand", () => {
    for (const o of HANDLEIDING_ONDERWERPEN) {
      expect(o.id.trim().length).toBeGreaterThan(0);
      expect(o.titel.trim().length).toBeGreaterThan(0);
      expect(o.punten.length).toBeGreaterThan(0);
      for (const punt of o.punten) expect(punt.trim().length).toBeGreaterThan(0);
      expect(o.route.startsWith("/")).toBe(true);
      expect(o.bestand).toMatch(/^\d{2}-[a-z0-9-]+\.png$/);
    }
  });

  it("id's en bestandsnamen zijn uniek", () => {
    const ids = HANDLEIDING_ONDERWERPEN.map((o) => o.id);
    const namen = HANDLEIDING_ONDERWERPEN.map((o) => o.bestand);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(namen).size).toBe(namen.length);
  });

  it("routes met een opdracht gebruiken de :id-placeholder", () => {
    for (const o of HANDLEIDING_ONDERWERPEN.filter((o) => o.route.includes("/opdracht/"))) {
      expect(o.route).toContain(":id");
    }
  });
});
