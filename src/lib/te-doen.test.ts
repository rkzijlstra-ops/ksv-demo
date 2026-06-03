import { describe, it, expect } from "vitest";
import { teDoenTelling, type TellbareOpdracht } from "./te-doen";
import type { DashboardStatus } from "./db";

function o(
  status: DashboardStatus,
  opts: { gewijzigd?: boolean; ref?: string | null } = {},
): TellbareOpdracht {
  return {
    dashboard_status: status,
    gewijzigd_te_versturen: opts.gewijzigd ?? false,
    referentienummer: opts.ref === undefined ? "1234" : opts.ref,
  };
}

describe("teDoenTelling", () => {
  it("telt te plannen = status binnen", () => {
    const t = teDoenTelling([o("binnen"), o("binnen"), o("gepland")]);
    expect(t.tePlannen).toBe(2);
  });

  it("telt te versturen = concept_gepland plus gewijzigd-gemarkeerde verstuurde opdrachten", () => {
    const t = teDoenTelling([
      o("concept_gepland"),
      o("gepland", { gewijzigd: true }),
      o("bevestigd", { gewijzigd: true }),
      o("gepland"), // niet gewijzigd, telt niet mee
    ]);
    expect(t.teVersturen).toBe(3);
  });

  it("telt niet bevestigd = status gepland", () => {
    const t = teDoenTelling([o("gepland"), o("gepland"), o("bevestigd")]);
    expect(t.nietBevestigd).toBe(2);
  });

  it("telt aandacht = actieve opdracht zonder referentienummer", () => {
    const t = teDoenTelling([
      o("binnen", { ref: null }),
      o("gepland", { ref: null }),
      o("opgeleverd", { ref: null }), // niet actief, telt niet als aandacht
      o("binnen", { ref: "7444" }),
    ]);
    expect(t.aandacht).toBe(2);
  });

  it("geeft alle tellers op nul bij een lege lijst", () => {
    expect(teDoenTelling([])).toEqual({
      tePlannen: 0,
      teVersturen: 0,
      nietBevestigd: 0,
      aandacht: 0,
    });
  });
});
