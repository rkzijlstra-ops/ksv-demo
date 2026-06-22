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
  nieuweDuurNaResize,
  duurNaStap,
  weekschuifLanding,
  weekHeeftWeekendKlus,
  maandWeken,
  verschuifMaand,
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
  it("geeft ma t/m vr (5 werkdagen) standaard", () => {
    expect(weekDagen("2026-06-08")).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("geeft ma t/m zo (7 dagen) als het weekend getoond wordt", () => {
    expect(weekDagen("2026-06-08", true)).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
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
  it("een werkdag-klus die in het weekend zou eindigen, slaat het weekend over", () => {
    // wo 10 jun + 4 = wo, do, vr, (weekend over), ma
    expect(werkdagenVanaf("2026-06-10", 4)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-15",
    ]);
  });
  it("een startdatum IN het weekend blijft op die weekenddag (kalenderdagen, weekend telt mee)", () => {
    // za 13 jun: een bewust weekend-klus blijft in het weekend i.p.v. naar maandag te springen
    expect(werkdagenVanaf("2026-06-13", 1)).toEqual(["2026-06-13"]); // za
    expect(werkdagenVanaf("2026-06-14", 1)).toEqual(["2026-06-14"]); // zo
    expect(werkdagenVanaf("2026-06-13", 2)).toEqual(["2026-06-13", "2026-06-14"]); // za, zo
    expect(werkdagenVanaf("2026-06-13", 3)).toEqual(["2026-06-13", "2026-06-14", "2026-06-15"]); // za, zo, ma
  });
  it("met weekend AAN telt het weekend als werkdag mee (kalenderdagen)", () => {
    // vr 12 jun + 2 dagen, weekend aan -> vr, za (NIET vr, ma)
    expect(werkdagenVanaf("2026-06-12", 2, true)).toEqual(["2026-06-12", "2026-06-13"]);
    // vr + 3 -> vr, za, zo
    expect(werkdagenVanaf("2026-06-12", 3, true)).toEqual(["2026-06-12", "2026-06-13", "2026-06-14"]);
    // ma + 6 -> ma t/m za
    expect(werkdagenVanaf("2026-06-08", 6, true)).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
    ]);
  });
  it("met weekend UIT (expliciet) blijft het weekend overgeslagen", () => {
    expect(werkdagenVanaf("2026-06-12", 2, false)).toEqual(["2026-06-12", "2026-06-15"]); // vr, ma
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

  it("laat pool (binnen) en geannuleerd weg, maar toont opgeleverd (afgerond overzicht)", () => {
    const p = plaatsOpdrachten(
      [
        opdr({ id: "b", dashboard_status: "binnen" }),
        opdr({ id: "x", dashboard_status: "geannuleerd" }),
        opdr({ id: "o", dashboard_status: "opgeleverd" }),
        opdr({ id: "g", dashboard_status: "gepland" }),
      ],
      WEEK,
    );
    // Opgeleverd blijft op zijn dag staan (groen); binnen/geannuleerd niet.
    expect(p.map((x) => x.opdracht.id).sort()).toEqual(["g", "o"]);
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

  it("opgeleverde klus telt niet mee (afgerond werk blokkeert geen nieuwe boeking)", () => {
    const set = vindDubbeleBoekingen([
      b({ id: "a", dashboard_status: "opgeleverd" }),
      b({ id: "c", dashboard_status: "gepland" }),
    ]);
    // Geen vals alarm: de nieuwe (geplande) klus mag op de dag van een al opgeleverde klus.
    expect(set.size).toBe(0);
  });
});

describe("nieuweDuurNaResize", () => {
  // Het slepen van de rechterrand: elke dagkolom = één werkdag erbij/eraf. De huidige zichtbare span
  // bepaalt hoe ver je naar links mag (de balk moet minstens één kolom in deze week zichtbaar blijven).
  it("naar rechts slepen verlengt de duur met het aantal kolommen", () => {
    // 1-daagse klus, span 1, twee kolommen naar rechts -> 3 dagen.
    expect(nieuweDuurNaResize(1, 1, 2)).toBe(3);
  });

  it("naar links slepen verkort de duur", () => {
    // 3-daagse klus volledig zichtbaar (span 3), één kolom terug -> 2 dagen.
    expect(nieuweDuurNaResize(3, 3, -1)).toBe(2);
  });

  it("kan niet korter dan één zichtbare kolom in deze week (balk blijft zichtbaar)", () => {
    // 3-daagse klus, span 3: max 2 kolommen inkorten houdt 1 kolom over -> duur 1, niet lager.
    expect(nieuweDuurNaResize(3, 3, -5)).toBe(1);
  });

  it("klus die uit een vorige week doorloopt: inkorten stopt bij de zichtbare staart", () => {
    // duur 4, maar deze week maar 2 dagen zichtbaar (span 2, begon vorige week). Eén kolom terug ->
    // duur 3; verder terug mag niet, anders verdwijnt de balk uit deze week.
    expect(nieuweDuurNaResize(4, 2, -1)).toBe(3);
    expect(nieuweDuurNaResize(4, 2, -5)).toBe(3);
  });

  it("voorbij vrijdag doorslepen verlengt door (loopt in de volgende week door)", () => {
    // 1-daagse klus op vrijdag (span 1), 3 kolommen naar rechts -> 4 werkdagen (vr + ma/di/wo erna).
    expect(nieuweDuurNaResize(1, 1, 3)).toBe(4);
  });

  it("begrenst op een veilig maximum aantal werkdagen", () => {
    expect(nieuweDuurNaResize(1, 1, 999)).toBe(20);
  });

  it("delta 0 laat de duur ongemoeid", () => {
    expect(nieuweDuurNaResize(2, 2, 0)).toBe(2);
  });
});

describe("duurNaStap", () => {
  // De -/+ knoppen op een montage-balk: één klik = één werkdag erbij of eraf (loopt vanzelf door over
  // het weekend heen, want de weergave knipt op vrijdag). Minimaal 1, met een veilige bovengrens.
  it("plus voegt een dag toe", () => {
    expect(duurNaStap(2, 1)).toBe(3);
  });
  it("min haalt een dag eraf", () => {
    expect(duurNaStap(3, -1)).toBe(2);
  });
  it("kan niet onder 1 dag", () => {
    expect(duurNaStap(1, -1)).toBe(1);
  });
  it("begrenst op het maximum", () => {
    expect(duurNaStap(20, 1, 20)).toBe(20);
  });
});

describe("maandWeken", () => {
  it("geeft de maandag van elke week die de maand raakt", () => {
    // juni 2026: 1 jun is een maandag, 30 jun een dinsdag -> 5 weken
    expect(maandWeken("2026-06-15")).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
  });
  it("begint op de maandag vóór de 1e als de maand niet op maandag start", () => {
    // juli 2026: 1 jul is een woensdag -> eerste strook begint op ma 29 jun
    expect(maandWeken("2026-07-10")[0]).toBe("2026-06-29");
  });
});

describe("verschuifMaand", () => {
  it("schuift naar de 1e van de volgende/vorige maand", () => {
    expect(verschuifMaand("2026-06-15", 1)).toBe("2026-07-01");
    expect(verschuifMaand("2026-06-15", -1)).toBe("2026-05-01");
    expect(verschuifMaand("2026-06-15", 0)).toBe("2026-06-01");
  });
  it("rolt netjes over het jaar", () => {
    expect(verschuifMaand("2026-01-15", -1)).toBe("2025-12-01");
    expect(verschuifMaand("2026-12-15", 1)).toBe("2027-01-01");
  });
});

describe("plaatsOpdrachten met weekend", () => {
  const WEEK7 = weekDagen("2026-06-08", true); // ma 8 t/m zo 14 juni (7 dagen)
  it("vrijdag 2 dagen, weekend AAN: loopt door naar zaterdag (vr+za, span 2)", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-12", duur_dagen: 2 })], WEEK7, true);
    expect(p).toHaveLength(1);
    expect(p[0].dagIndex).toBe(4); // vrijdag
    expect(p[0].span).toBe(2); // vr + za
  });
  it("vrijdag 2 dagen, weekend UIT: alleen vrijdag deze week (rest = maandag volgende week)", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-12", duur_dagen: 2 })], WEEK, false);
    expect(p[0].dagIndex).toBe(4);
    expect(p[0].span).toBe(1);
  });
  it("vrijdag 3 dagen, weekend aan: vr, za, zo (span 3)", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-12", duur_dagen: 3 })], WEEK7, true);
    expect(p[0].dagIndex).toBe(4);
    expect(p[0].span).toBe(3);
  });
  it("maandag 6 dagen, weekend aan: ma t/m za (span 6)", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-08", duur_dagen: 6 })], WEEK7, true);
    expect(p[0].dagIndex).toBe(0);
    expect(p[0].span).toBe(6);
  });
  it("een klus die OP zaterdag staat blijft op zaterdag (kolom 5), ook met weekend-vlag uit", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-13", duur_dagen: 1 })], WEEK7, false);
    expect(p[0].dagIndex).toBe(5);
    expect(p[0].span).toBe(1);
  });
  // "Onlogische" invoer die toch netjes moet lopen:
  it("donderdag 5 dagen, weekend aan: do/vr/za/zo deze week (span 4), maandag loopt door", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-11", duur_dagen: 5 })], WEEK7, true);
    expect(p[0].dagIndex).toBe(3); // donderdag
    expect(p[0].span).toBe(4); // do, vr, za, zo
  });
  it("zondag-start 2 dagen, weekend aan: zondag deze week (span 1), maandag loopt door", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-14", duur_dagen: 2 })], WEEK7, true);
    expect(p[0].dagIndex).toBe(6); // zondag
    expect(p[0].span).toBe(1);
  });
  it("rare duur (0) wordt minimaal 1 dag", () => {
    const p = plaatsOpdrachten([opdr({ id: "a", startdatum: "2026-06-10", duur_dagen: 0 })], WEEK7, true);
    expect(p[0].span).toBe(1);
  });
});

describe("weekHeeftWeekendKlus", () => {
  const base = (o: Partial<PlanbaarOpdracht>): PlanbaarOpdracht => ({
    id: "x",
    monteur_naam: "Rein",
    startdatum: null,
    starttijd: null,
    duur_dagen: 1,
    dashboard_status: "gepland",
    ...o,
  });
  // maandag 8 jun -> weekend = za 13 jun, zo 14 jun.
  it("false als alle klussen op werkdagen staan", () => {
    expect(weekHeeftWeekendKlus([base({ startdatum: "2026-06-10" })], "2026-06-08")).toBe(false);
  });
  it("true als een service-klus op zaterdag staat", () => {
    expect(
      weekHeeftWeekendKlus([base({ startdatum: "2026-06-13", starttijd: "10:00" })], "2026-06-08"),
    ).toBe(true);
  });
  it("true als een montage op zondag start", () => {
    expect(weekHeeftWeekendKlus([base({ startdatum: "2026-06-14" })], "2026-06-08")).toBe(true);
  });
  it("false als de weekend-klus in een andere week valt", () => {
    expect(weekHeeftWeekendKlus([base({ startdatum: "2026-06-20" })], "2026-06-08")).toBe(false);
  });
  it("false zonder monteur of zonder startdatum (wordt toch niet geplaatst)", () => {
    expect(weekHeeftWeekendKlus([base({ startdatum: "2026-06-13", monteur_naam: null })], "2026-06-08")).toBe(false);
  });
  it("true: een vrijdag-montage van 2 dagen met weekend aan bezet zaterdag", () => {
    expect(
      weekHeeftWeekendKlus([base({ startdatum: "2026-06-12", duur_dagen: 2 })], "2026-06-08", true),
    ).toBe(true);
  });
  it("false: dezelfde vrijdag-montage met weekend uit bezet geen weekenddag (vr+ma)", () => {
    expect(
      weekHeeftWeekendKlus([base({ startdatum: "2026-06-12", duur_dagen: 2 })], "2026-06-08", false),
    ).toBe(false);
  });
});

describe("weekschuifLanding", () => {
  // Een klus via de rand-strook een week verschuiven landt net OVER de grens:
  //  - volgende week -> op de MAANDAG (begin van die week);
  //  - vorige week -> op de LAATSTE getoonde dag (vrijdag als het weekend uit staat, zondag als het aan staat).
  it("volgende week -> maandag van de volgende week (ongeacht weekend)", () => {
    expect(weekschuifLanding("2026-06-12", 1, false)).toBe("2026-06-15"); // vr -> ma 15 jun
    expect(weekschuifLanding("2026-06-10", 1, false)).toBe("2026-06-15"); // wo -> ma 15 jun
    expect(weekschuifLanding("2026-06-12", 1, true)).toBe("2026-06-15"); // weekend aan: nog steeds maandag
  });

  it("vorige week, weekend UIT -> vrijdag van de vorige week", () => {
    expect(weekschuifLanding("2026-06-15", -1, false)).toBe("2026-06-12"); // ma 15 -> vr 12 jun
    expect(weekschuifLanding("2026-06-17", -1, false)).toBe("2026-06-12"); // wo 17 -> vr 12 jun
  });

  it("vorige week, weekend AAN -> zondag van de vorige week", () => {
    expect(weekschuifLanding("2026-06-15", -1, true)).toBe("2026-06-14"); // ma 15 -> zo 14 jun
  });
});
