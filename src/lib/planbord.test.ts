import { describe, it, expect } from "vitest";
import {
  verschuifDagen,
  werkdagenVanaf,
  maandagVan,
  weekDagen,
  weeknummer,
  monteurRijen,
  plaatsOpdrachten,
  verdeelLanes,
  vindDubbeleBoekingen,
  zoekPlanbord,
  type PlanbaarOpdracht,
  type BoekbaarOpdracht,
  type ZoekbaarOpdracht,
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

const WEEK = weekDagen("2026-06-08"); // ma 8 t/m vr 12 juni
const WEEK_ERNA = weekDagen("2026-06-15"); // ma 15 t/m vr 19 juni

describe("werkdagenVanaf", () => {
  it("telt werkdagen en slaat het weekend over", () => {
    // do 11 jun + 4 werkdagen = do, vr, (weekend over), ma, di
    expect(werkdagenVanaf("2026-06-11", 4)).toEqual([
      "2026-06-11",
      "2026-06-12",
      "2026-06-15",
      "2026-06-16",
    ]);
  });
  it("vanaf vrijdag loopt het door naar maandag/dinsdag", () => {
    expect(werkdagenVanaf("2026-06-12", 3)).toEqual(["2026-06-12", "2026-06-15", "2026-06-16"]);
  });
  it("een startdatum in het weekend begint op de eerstvolgende werkdag", () => {
    // za 13 jun -> eerste werkdag is ma 15 jun
    expect(werkdagenVanaf("2026-06-13", 1)).toEqual(["2026-06-15"]);
  });
});

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

  it("toont in de startweek alleen de dagen tot en met vrijdag", () => {
    const p = plaatsOpdrachten([opdr({ id: "m", startdatum: "2026-06-12", duur_dagen: 3 })], WEEK);
    expect(p[0].dagIndex).toBe(4); // vr
    expect(p[0].span).toBe(1); // alleen vrijdag in deze week
  });

  it("laat een meerdaagse montage doorlopen naar de week erna (werkdagen)", () => {
    // do 11 jun, 4 werkdagen: do+vr deze week, ma+di de week erna.
    const o = opdr({ id: "m", startdatum: "2026-06-11", duur_dagen: 4 });
    const deze = plaatsOpdrachten([o], WEEK);
    expect(deze[0].dagIndex).toBe(3); // do
    expect(deze[0].span).toBe(2); // do + vr

    const erna = plaatsOpdrachten([o], WEEK_ERNA);
    expect(erna).toHaveLength(1);
    expect(erna[0].dagIndex).toBe(0); // ma
    expect(erna[0].span).toBe(2); // ma + di
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

describe("zoekPlanbord", () => {
  function z(over: Partial<ZoekbaarOpdracht> & { id: string }): ZoekbaarOpdracht {
    return {
      id: over.id,
      klant_naam: over.klant_naam ?? null,
      klant_adres: over.klant_adres ?? null,
      referentienummer: over.referentienummer ?? null,
      monteur_naam: "monteur_naam" in over ? (over.monteur_naam ?? null) : "Rein",
      startdatum: "startdatum" in over ? (over.startdatum ?? null) : "2026-06-10",
      dashboard_status: over.dashboard_status ?? ("gepland" as DashboardStatus),
    };
  }

  it("lege zoekterm geeft niets", () => {
    expect(zoekPlanbord([z({ id: "a", klant_naam: "Bakker" })], "  ")).toEqual([]);
  });

  it("vindt op klantnaam, hoofdletterongevoelig en op deel", () => {
    const r = zoekPlanbord([z({ id: "a", klant_naam: "Fam. Bakker" }), z({ id: "b", klant_naam: "De Wit" })], "bak");
    expect(r.map((o) => o.id)).toEqual(["a"]);
  });

  it("vindt op referentienummer en op adres", () => {
    const lijst = [
      z({ id: "ref", referentienummer: "7588" }),
      z({ id: "adr", klant_adres: "Hoofdstraat 12, Voorschoten" }),
    ];
    expect(zoekPlanbord(lijst, "7588").map((o) => o.id)).toEqual(["ref"]);
    expect(zoekPlanbord(lijst, "voorschoten").map((o) => o.id)).toEqual(["adr"]);
  });

  it("negeert opgeleverde en geannuleerde klussen", () => {
    const lijst = [
      z({ id: "g", klant_naam: "Bakker", dashboard_status: "gepland" }),
      z({ id: "op", klant_naam: "Bakker", dashboard_status: "opgeleverd" }),
      z({ id: "an", klant_naam: "Bakker", dashboard_status: "geannuleerd" }),
    ];
    expect(zoekPlanbord(lijst, "bakker").map((o) => o.id)).toEqual(["g"]);
  });

  it("neemt klussen uit de pool (binnen) mee", () => {
    const r = zoekPlanbord(
      [z({ id: "p", klant_naam: "Bakker", dashboard_status: "binnen", startdatum: null })],
      "bakker",
    );
    expect(r.map((o) => o.id)).toEqual(["p"]);
  });

  it("sorteert op datum, klussen zonder datum (pool) achteraan", () => {
    const r = zoekPlanbord(
      [
        z({ id: "laat", klant_naam: "Bakker", startdatum: "2026-07-20" }),
        z({ id: "pool", klant_naam: "Bakker", dashboard_status: "binnen", startdatum: null }),
        z({ id: "vroeg", klant_naam: "Bakker", startdatum: "2026-06-10" }),
      ],
      "bakker",
    );
    expect(r.map((o) => o.id)).toEqual(["vroeg", "laat", "pool"]);
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

  it("meerdaagse montage + service op dezelfde dag = geen conflict (bewust gepland)", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", startdatum: "2026-06-10", duur_dagen: 3 }),
      b({ id: "c", startdatum: "2026-06-12", starttijd: "10:00" }),
    ]);
    expect(set.size).toBe(0);
  });

  it("meerdaagse montage + tweede montage op overlappende dag = conflict", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", startdatum: "2026-06-10", duur_dagen: 3 }),
      b({ id: "c", startdatum: "2026-06-12", duur_dagen: 1 }),
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
