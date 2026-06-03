import { describe, it, expect } from "vitest";
import { planningTijd, duurLabel, type PlanbareOpdracht } from "./opdracht-weergave";

function o(over: Partial<PlanbareOpdracht> = {}): PlanbareOpdracht {
  return {
    startdatum: over.startdatum ?? null,
    starttijd: over.starttijd ?? null,
    duur_dagen: over.duur_dagen ?? 1,
  };
}

describe("planningTijd", () => {
  it("geeft 'Nog niet gepland' zonder startdatum", () => {
    expect(planningTijd(o())).toBe("Nog niet gepland");
  });

  it("toont 'start <datum>' als dagblok (geen tijd, montage)", () => {
    expect(planningTijd(o({ startdatum: "2026-06-14" }))).toBe("start 14 jun");
  });

  it("toont '<datum> · <tijd>' als er een starttijd is (service)", () => {
    expect(planningTijd(o({ startdatum: "2026-06-12", starttijd: "10:00" }))).toBe("12 jun · 10:00");
    expect(planningTijd(o({ startdatum: "2026-06-12", starttijd: "13:30:00" }))).toBe("12 jun · 13:30");
  });
});

describe("duurLabel", () => {
  it("enkelvoud bij 1 dag", () => {
    expect(duurLabel(1)).toBe("1 dag");
  });
  it("meervoud bij meer dagen", () => {
    expect(duurLabel(2)).toBe("2 dagen");
    expect(duurLabel(3)).toBe("3 dagen");
  });
});
