import { describe, it, expect } from "vitest";
import {
  verschuifDagen,
  maandagVan,
  weekDagen,
  weeknummer,
  monteurRijen,
  plaatsOpdrachten,
  type PlanbaarOpdracht,
} from "./planbord";
import type { DashboardStatus } from "./db";

describe("verschuifDagen", () => {
  it("telt dagen op en af, over maandgrenzen heen", () => {
    expect(verschuifDagen("2026-06-09", 7)).toBe("2026-06-16");
    expect(verschuifDagen("2026-06-01", -1)).toBe("2026-05-31");
  });
});

describe("maandagVan", () => {
  it("geeft de maandag van de week (dinsdag -> maandag ervoor)", () => {
    expect(maandagVan("2026-06-09")).toBe("2026-06-08"); // di 9 jun -> ma 8 jun
  });
  it("een maandag geeft zichzelf", () => {
    expect(maandagVan("2026-06-08")).toBe("2026-06-08");
  });
  it("een zondag valt nog bij de maandag ervoor", () => {
    expect(maandagVan("2026-06-14")).toBe("2026-06-08");
  });
});

describe("weekDagen", () => {
  it("geeft ma t/m vr (5 werkdagen)", () => {
    expect(weekDagen("2026-06-08")).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });
});

describe("weeknummer", () => {
  it("ISO-weeknummer (9 juni 2026 = week 24)", () => {
    expect(weeknummer("2026-06-09")).toBe(24);
  });
});

function opdr(
  over: Partial<PlanbaarOpdracht> & { id: string },
): PlanbaarOpdracht {
  return {
    id: over.id,
    monteur_naam: "monteur_naam" in over ? (over.monteur_naam ?? null) : "Rein",
    startdatum: over.startdatum ?? "2026-06-08",
    starttijd: over.starttijd ?? null,
    duur_dagen: over.duur_dagen ?? 1,
    dashboard_status: over.dashboard_status ?? ("gepland" as DashboardStatus),
  };
}

const WEEK = weekDagen("2026-06-08");

describe("monteurRijen", () => {
  it("geeft unieke monteurs gesorteerd", () => {
    const rijen = monteurRijen([
      opdr({ id: "a", monteur_naam: "Rein" }),
      opdr({ id: "b", monteur_naam: "Dani" }),
      opdr({ id: "c", monteur_naam: "Rein" }),
    ]);
    expect(rijen).toEqual(["Dani", "Rein"]);
  });
  it("negeert opdrachten zonder monteur", () => {
    expect(monteurRijen([opdr({ id: "a", monteur_naam: null })])).toEqual([]);
  });
});

describe("plaatsOpdrachten", () => {
  it("plaatst een montage als dagblok op de juiste dagkolom met span = duur_dagen", () => {
    const p = plaatsOpdrachten([opdr({ id: "m", startdatum: "2026-06-10", duur_dagen: 2 })], WEEK);
    expect(p).toHaveLength(1);
    expect(p[0].dagIndex).toBe(2); // wo
    expect(p[0].span).toBe(2);
    expect(p[0].isService).toBe(false);
  });

  it("plaatst een service (met tijd) als kaartje met span 1", () => {
    const p = plaatsOpdrachten(
      [opdr({ id: "s", startdatum: "2026-06-09", starttijd: "10:00", duur_dagen: 1 })],
      WEEK,
    );
    expect(p[0].dagIndex).toBe(1);
    expect(p[0].span).toBe(1);
    expect(p[0].isService).toBe(true);
  });

  it("knipt een meerdaags blok af op het einde van de week", () => {
    const p = plaatsOpdrachten([opdr({ id: "m", startdatum: "2026-06-12", duur_dagen: 3 })], WEEK);
    expect(p[0].dagIndex).toBe(4); // vr
    expect(p[0].span).toBe(1); // niet voorbij vrijdag
  });

  it("laat opdrachten buiten de week weg", () => {
    const p = plaatsOpdrachten([opdr({ id: "x", startdatum: "2026-06-20" })], WEEK);
    expect(p).toEqual([]);
  });

  it("laat niet-geplande statussen (binnen, opgeleverd, geannuleerd) weg", () => {
    const p = plaatsOpdrachten(
      [
        opdr({ id: "b", dashboard_status: "binnen" }),
        opdr({ id: "o", dashboard_status: "opgeleverd" }),
        opdr({ id: "g", dashboard_status: "gepland" }),
      ],
      WEEK,
    );
    expect(p.map((x) => x.opdracht.id)).toEqual(["g"]);
  });
});
