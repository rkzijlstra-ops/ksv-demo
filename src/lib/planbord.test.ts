import { describe, it, expect } from "vitest";
import {
  verschuifDagen,
  maandagVan,
  weekDagen,
  weeknummer,
  monteurRijen,
  plaatsOpdrachten,
  verdeelLanes,
  vindDubbeleBoekingen,
  type PlanbaarOpdracht,
  type BoekbaarOpdracht,
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

describe("verdeelLanes", () => {
  it("zet niet-overlappende opdrachten op dezelfde lane", () => {
    const ps = plaatsOpdrachten(
      [opdr({ id: "a", startdatum: "2026-06-08" }), opdr({ id: "b", startdatum: "2026-06-10" })],
      WEEK,
    );
    expect(verdeelLanes(ps).every((k) => k.lane === 0)).toBe(true);
  });

  it("stapelt overlappende opdrachten in aparte lanes", () => {
    const ps = plaatsOpdrachten(
      [
        opdr({ id: "a", startdatum: "2026-06-09", starttijd: "08:00" }),
        opdr({ id: "b", startdatum: "2026-06-09", starttijd: "10:00" }),
      ],
      WEEK,
    );
    expect(
      verdeelLanes(ps)
        .map((k) => k.lane)
        .sort(),
    ).toEqual([0, 1]);
  });

  it("laat een meerdaags blok en een overlappende dag in aparte lanes vallen", () => {
    const ps = plaatsOpdrachten(
      [
        opdr({ id: "m", startdatum: "2026-06-08", duur_dagen: 2 }),
        opdr({ id: "s", startdatum: "2026-06-09", starttijd: "10:00" }),
      ],
      WEEK,
    );
    const k = verdeelLanes(ps);
    const mLane = k.find((x) => x.plaatsing.opdracht.id === "m")!.lane;
    const sLane = k.find((x) => x.plaatsing.opdracht.id === "s")!.lane;
    expect(mLane).not.toBe(sLane);
  });

  it("lege invoer geeft lege uitvoer", () => {
    expect(verdeelLanes([])).toEqual([]);
  });
});

describe("vindDubbeleBoekingen", () => {
  const basis = { duur_dagen: 1, dashboard_status: "gepland" as DashboardStatus };
  function b(over: Partial<BoekbaarOpdracht>): BoekbaarOpdracht {
    return {
      id: over.id ?? "x",
      toegewezen_aan: over.toegewezen_aan ?? "m1",
      startdatum: over.startdatum ?? "2026-06-10",
      starttijd: over.starttijd ?? null,
      duur_dagen: over.duur_dagen ?? basis.duur_dagen,
      dashboard_status: over.dashboard_status ?? basis.dashboard_status,
    };
  }

  it("twee montages, zelfde monteur, zelfde dag = conflict", () => {
    const set = vindDubbeleBoekingen([b({ id: "a" }), b({ id: "c" })]);
    expect(set.has("a")).toBe(true);
    expect(set.has("c")).toBe(true);
  });

  it("verschillende monteurs op dezelfde dag = geen conflict", () => {
    const set = vindDubbeleBoekingen([b({ id: "a", toegewezen_aan: "m1" }), b({ id: "c", toegewezen_aan: "m2" })]);
    expect(set.size).toBe(0);
  });

  it("twee services zelfde dag, andere tijd = geen conflict", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", starttijd: "09:00" }),
      b({ id: "c", starttijd: "13:00" }),
    ]);
    expect(set.size).toBe(0);
  });

  it("twee services zelfde dag, zelfde tijd = conflict", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", starttijd: "09:00" }),
      b({ id: "c", starttijd: "09:00:00" }),
    ]);
    expect(set.has("a")).toBe(true);
    expect(set.has("c")).toBe(true);
  });

  it("meerdaagse montage die over een andere klus heen valt = conflict", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", startdatum: "2026-06-10", duur_dagen: 3 }),
      b({ id: "c", startdatum: "2026-06-12", starttijd: "10:00" }),
    ]);
    expect(set.has("a")).toBe(true);
    expect(set.has("c")).toBe(true);
  });

  it("geannuleerde opdracht telt niet mee", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a" }),
      b({ id: "c", dashboard_status: "geannuleerd" }),
    ]);
    expect(set.size).toBe(0);
  });
});
