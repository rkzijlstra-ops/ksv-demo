import { describe, it, expect, beforeEach } from "vitest";
import {
  meldingConceptSleutel,
  leegConcept,
  bewaarMeldingConcept,
  leesMeldingConcept,
  wisMeldingConcept,
  type MeldingConcept,
} from "./melding-concept";

// In-memory localStorage-stub (vitest draait in node, geen DOM).
class StorageStub {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  get length() {
    return this.m.size;
  }
  key() {
    return null;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new StorageStub() as unknown as Storage;
});

const vol: MeldingConcept = { tekst: "Front kapot", spoed: true, fotoUrls: ["https://x/a.jpg"], videoUrl: "https://x/v.mp4" };

describe("meldingConceptSleutel", () => {
  it("nieuw (zonder meldingId) krijgt het achtervoegsel 'nieuw'", () => {
    expect(meldingConceptSleutel("opdr-1")).toBe("melding-concept:opdr-1:nieuw");
  });
  it("bewerken krijgt de meldingId in de sleutel (los van nieuw)", () => {
    expect(meldingConceptSleutel("opdr-1", "m-9")).toBe("melding-concept:opdr-1:m-9");
  });
});

describe("leegConcept", () => {
  it("alles leeg = leeg", () => {
    expect(leegConcept({ tekst: "   ", spoed: false, fotoUrls: [], videoUrl: null })).toBe(true);
  });
  it("alleen spoed aan = niet leeg", () => {
    expect(leegConcept({ tekst: "", spoed: true, fotoUrls: [], videoUrl: null })).toBe(false);
  });
  it("alleen een foto = niet leeg", () => {
    expect(leegConcept({ tekst: "", spoed: false, fotoUrls: ["x"], videoUrl: null })).toBe(false);
  });
});

describe("bewaren/lezen/wissen round-trip", () => {
  it("bewaart en leest een vol concept terug", () => {
    bewaarMeldingConcept("opdr-1", undefined, vol);
    expect(leesMeldingConcept("opdr-1")).toEqual(vol);
  });

  it("een leeg concept wordt niet bewaard (en wist een bestaand)", () => {
    bewaarMeldingConcept("opdr-1", undefined, vol);
    bewaarMeldingConcept("opdr-1", undefined, { tekst: "", spoed: false, fotoUrls: [], videoUrl: null });
    expect(leesMeldingConcept("opdr-1")).toBeNull();
  });

  it("nieuw en bewerken delen geen concept (aparte sleutel)", () => {
    bewaarMeldingConcept("opdr-1", undefined, vol);
    expect(leesMeldingConcept("opdr-1", "m-9")).toBeNull();
  });

  it("wissen verwijdert het concept", () => {
    bewaarMeldingConcept("opdr-1", "m-9", vol);
    wisMeldingConcept("opdr-1", "m-9");
    expect(leesMeldingConcept("opdr-1", "m-9")).toBeNull();
  });

  it("corrupte opslag geeft netjes null", () => {
    localStorage.setItem(meldingConceptSleutel("opdr-1"), "{geen json");
    expect(leesMeldingConcept("opdr-1")).toBeNull();
  });
});
