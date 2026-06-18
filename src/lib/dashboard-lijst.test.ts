import { describe, it, expect } from "vitest";
import {
  zoekMatch,
  filterOpdrachten,
  groepeerPerStatus,
  zoekTreffers,
  type ZoekbareOpdracht,
} from "./dashboard-lijst";
import type { DashboardStatus } from "./db";

function o(
  over: Partial<ZoekbareOpdracht> & { dashboard_status?: DashboardStatus } = {},
): ZoekbareOpdracht {
  return {
    klant_naam: over.klant_naam ?? "J. Jansen",
    referentienummer: over.referentienummer ?? "7444",
    monteur_naam: over.monteur_naam ?? null,
    klant_adres: over.klant_adres ?? "Hoofdstraat 12",
    dashboard_status: over.dashboard_status ?? "binnen",
    teruggemeld_at: over.teruggemeld_at ?? null,
  };
}

describe("zoekMatch", () => {
  it("lege zoekterm matcht alles", () => {
    expect(zoekMatch(o(), "")).toBe(true);
    expect(zoekMatch(o(), "   ")).toBe(true);
  });

  it("matcht op klantnaam, hoofdletterongevoelig", () => {
    expect(zoekMatch(o({ klant_naam: "Fam. Bakker" }), "bakker")).toBe(true);
  });

  it("matcht op referentienummer en monteur en adres", () => {
    expect(zoekMatch(o({ referentienummer: "7588" }), "7588")).toBe(true);
    expect(zoekMatch(o({ monteur_naam: "Rein" }), "rein")).toBe(true);
    expect(zoekMatch(o({ klant_adres: "Dorpsstraat 3" }), "dorp")).toBe(true);
  });

  it("geeft false als niets matcht", () => {
    expect(zoekMatch(o({ klant_naam: "Jansen", referentienummer: "7444" }), "xyz")).toBe(false);
  });
});

describe("filterOpdrachten", () => {
  const lijst = [
    o({ klant_naam: "Bakker", dashboard_status: "binnen" }),
    o({ klant_naam: "de Wit", dashboard_status: "gepland" }),
    o({ klant_naam: "Smit", dashboard_status: "opgeleverd" }),
  ];

  it("status 'alle' toont alles", () => {
    expect(filterOpdrachten(lijst, { zoek: "", status: "alle" })).toHaveLength(3);
  });

  it("filtert op een specifieke status", () => {
    const res = filterOpdrachten(lijst, { zoek: "", status: "gepland" });
    expect(res.map((r) => r.klant_naam)).toEqual(["de Wit"]);
  });

  it("combineert status en zoekterm", () => {
    expect(filterOpdrachten(lijst, { zoek: "bakker", status: "gepland" })).toHaveLength(0);
    expect(filterOpdrachten(lijst, { zoek: "bakker", status: "binnen" })).toHaveLength(1);
  });

  it("pseudo-filter 'teruggemeld' toont alleen klussen met teruggemeld_at, los van dashboard_status", () => {
    const met = [
      o({ klant_naam: "Teruggemeld", dashboard_status: "binnen", teruggemeld_at: "2026-06-17T10:00:00Z" }),
      o({ klant_naam: "Gewoon binnen", dashboard_status: "binnen", teruggemeld_at: null }),
      o({ klant_naam: "Gepland", dashboard_status: "gepland", teruggemeld_at: null }),
    ];
    const res = filterOpdrachten(met, { zoek: "", status: "teruggemeld" });
    expect(res.map((r) => r.klant_naam)).toEqual(["Teruggemeld"]);
  });
});

describe("zoekTreffers", () => {
  const lijst = [
    o({ klant_naam: "Bakker", dashboard_status: "binnen" }),
    o({ klant_naam: "Bakkerij de Wit", dashboard_status: "opgeleverd" }),
    o({ klant_naam: "Smit", dashboard_status: "gepland" }),
  ];

  it("lege zoekterm geeft niets (dropdown blijft dicht)", () => {
    expect(zoekTreffers(lijst, "   ")).toEqual([]);
  });

  it("vindt over alle statussen heen, ook opgeleverd", () => {
    const r = zoekTreffers(lijst, "bakker");
    expect(r.map((x) => x.klant_naam)).toEqual(["Bakker", "Bakkerij de Wit"]);
  });

  it("respecteert de limiet", () => {
    const veel = Array.from({ length: 20 }, (_, i) => o({ klant_naam: `Bakker ${i}` }));
    expect(zoekTreffers(veel, "bakker", 8)).toHaveLength(8);
  });
});

describe("groepeerPerStatus", () => {
  it("groepeert in vaste statusvolgorde en slaat lege groepen over", () => {
    const lijst = [
      o({ klant_naam: "A", dashboard_status: "opgeleverd" }),
      o({ klant_naam: "B", dashboard_status: "binnen" }),
      o({ klant_naam: "C", dashboard_status: "binnen" }),
    ];
    const groepen = groepeerPerStatus(lijst);
    expect(groepen.map((g) => g.status)).toEqual(["binnen", "opgeleverd"]);
    expect(groepen[0].opdrachten.map((x) => x.klant_naam)).toEqual(["B", "C"]);
  });

  it("geeft een lege array bij geen opdrachten", () => {
    expect(groepeerPerStatus([])).toEqual([]);
  });
});
