import { describe, it, expect } from "vitest";
import {
  ALLE_STATUSSEN,
  statusStijl,
  isActief,
  opVerzondenPlek,
  moetOpnieuwVersturenNa,
  uitvoerdatumVoorMonteur,
  klassificeerVerzending,
  type DashboardStatusStijl,
} from "./opdracht-status";
import type { DashboardStatus } from "./db";

describe("klassificeerVerzending", () => {
  it("nooit eerder verstuurd = nieuwe klus (geen verzet, geen vorige monteur)", () => {
    const r = klassificeerVerzending({
      toegewezen_aan: "A",
      verzonden_toegewezen_aan: null,
      verzonden_monteur: null,
    });
    expect(r.verzet).toBe(false);
    expect(r.vorigeMonteur).toBeNull();
  });

  it("eerder verstuurd aan dezelfde monteur = verzetting", () => {
    const r = klassificeerVerzending({
      toegewezen_aan: "A",
      verzonden_toegewezen_aan: "A",
      verzonden_monteur: "Anna",
    });
    expect(r.verzet).toBe(true);
    expect(r.vorigeMonteur).toBeNull();
  });

  it("eerder verstuurd aan een andere monteur = nieuw voor de nieuwe, vorige monteur krijgt bericht", () => {
    const r = klassificeerVerzending({
      toegewezen_aan: "B",
      verzonden_toegewezen_aan: "A",
      verzonden_monteur: "Anna",
    });
    expect(r.verzet).toBe(false);
    expect(r.vorigeMonteur).toEqual({ toegewezen_aan: "A", monteur_naam: "Anna" });
  });
});

describe("statusStijl", () => {
  it("geeft voor elke status een label, kleurToken en de juiste vlaggen", () => {
    const verwacht: Record<DashboardStatus, DashboardStatusStijl> = {
      binnen: { label: "Binnen", kleurToken: "ink-muted", gestreept: false, doorhaling: false },
      concept_gepland: {
        label: "Concept gepland",
        kleurToken: "accent",
        gestreept: true,
        doorhaling: false,
      },
      gepland: { label: "Gepland", kleurToken: "accent", gestreept: false, doorhaling: false },
      bevestigd: {
        label: "Bevestigd",
        kleurToken: "bevestigd",
        gestreept: false,
        doorhaling: false,
      },
      opgeleverd: {
        label: "Opgeleverd",
        kleurToken: "success",
        gestreept: false,
        doorhaling: false,
      },
      geannuleerd: {
        label: "Geannuleerd",
        kleurToken: "ink-muted",
        gestreept: false,
        doorhaling: true,
      },
    };
    for (const status of ALLE_STATUSSEN) {
      expect(statusStijl(status)).toEqual(verwacht[status]);
    }
  });

  it("concept_gepland is de enige gestreepte status (verstuur-poort)", () => {
    const gestreept = ALLE_STATUSSEN.filter((s) => statusStijl(s).gestreept);
    expect(gestreept).toEqual(["concept_gepland"]);
  });

  it("geannuleerd is de enige doorgehaalde status", () => {
    const doorgehaald = ALLE_STATUSSEN.filter((s) => statusStijl(s).doorhaling);
    expect(doorgehaald).toEqual(["geannuleerd"]);
  });
});

describe("isActief", () => {
  it("binnen, concept_gepland, gepland en bevestigd zijn actief werk", () => {
    expect(isActief("binnen")).toBe(true);
    expect(isActief("concept_gepland")).toBe(true);
    expect(isActief("gepland")).toBe(true);
    expect(isActief("bevestigd")).toBe(true);
  });

  it("opgeleverd en geannuleerd zijn niet actief (gaan naar archief-scoping)", () => {
    expect(isActief("opgeleverd")).toBe(false);
    expect(isActief("geannuleerd")).toBe(false);
  });
});

describe("opVerzondenPlek", () => {
  const verzonden = {
    toegewezen_aan: "m1",
    monteur_naam: "Rein",
    startdatum: "2026-06-10",
    starttijd: "10:00:00",
  };

  it("true als account, dag en tijd gelijk zijn (tijd op HH:MM)", () => {
    expect(
      opVerzondenPlek({ toegewezen_aan: "m1", startdatum: "2026-06-10", starttijd: "10:00" }, verzonden),
    ).toBe(true);
  });

  it("false bij ander account, andere dag of andere tijd", () => {
    expect(
      opVerzondenPlek({ toegewezen_aan: "m1", startdatum: "2026-06-11", starttijd: "10:00" }, verzonden),
    ).toBe(false);
    expect(
      opVerzondenPlek({ toegewezen_aan: "m2", startdatum: "2026-06-10", starttijd: "10:00" }, verzonden),
    ).toBe(false);
    expect(
      opVerzondenPlek({ toegewezen_aan: "m1", startdatum: "2026-06-10", starttijd: "13:00" }, verzonden),
    ).toBe(false);
  });

  it("bevinding 3: gelijke naam maar ander account telt niet als 'op de plek'", () => {
    // Zou met de oude naam-vergelijking ten onrechte true zijn geweest (twee monteurs 'Rein').
    expect(
      opVerzondenPlek({ toegewezen_aan: "m2", startdatum: "2026-06-10", starttijd: "10:00" }, verzonden),
    ).toBe(false);
  });

  it("dagblok zonder tijd matcht alleen een verzonden plek zonder tijd", () => {
    const dagblok = { toegewezen_aan: "m1", startdatum: "2026-06-10", starttijd: null };
    expect(opVerzondenPlek(dagblok, { ...verzonden, starttijd: null })).toBe(true);
    expect(opVerzondenPlek(dagblok, verzonden)).toBe(false);
  });

  it("false als er nooit verstuurd is (geen verzonden datum)", () => {
    expect(
      opVerzondenPlek(
        { toegewezen_aan: "m1", startdatum: "2026-06-10", starttijd: null },
        { toegewezen_aan: null, monteur_naam: null, startdatum: null, starttijd: null },
      ),
    ).toBe(false);
  });
});

describe("moetOpnieuwVersturenNa (resize/verplaatsen: ook een duur-wijziging telt)", () => {
  it("nog niet verstuurd (concept): nooit opnieuw, ook niet bij duur-wijziging", () => {
    expect(moetOpnieuwVersturenNa("concept_gepland", false, false)).toBe(false);
  });

  it("verstuurd, niets veranderd (plek én duur gelijk): niet opnieuw", () => {
    expect(moetOpnieuwVersturenNa("gepland", true, true)).toBe(false);
  });

  it("verstuurd, alleen de duur gewijzigd (plek gelijk): wel opnieuw", () => {
    // De monteur moet weten dat de klus nu langer/korter duurt.
    expect(moetOpnieuwVersturenNa("gepland", true, false)).toBe(true);
    expect(moetOpnieuwVersturenNa("bevestigd", true, false)).toBe(true);
  });

  it("verstuurd, alleen de plek gewijzigd (duur gelijk): wel opnieuw", () => {
    expect(moetOpnieuwVersturenNa("bevestigd", false, true)).toBe(true);
  });
});

describe("uitvoerdatumVoorMonteur (gat 1: afspraak vasthouden)", () => {
  it("toont de actuele datum als er geen hangende wijziging is", () => {
    expect(
      uitvoerdatumVoorMonteur({ uitvoerdatum: "2026-06-15", gewijzigd_te_versturen: false, verzonden_startdatum: "2026-06-10" }),
    ).toBe("2026-06-15");
  });

  it("toont de afgesproken (verzonden) datum zolang een wijziging nog niet opnieuw verstuurd is", () => {
    expect(
      uitvoerdatumVoorMonteur({ uitvoerdatum: "2026-06-20", gewijzigd_te_versturen: true, verzonden_startdatum: "2026-06-10" }),
    ).toBe("2026-06-10");
  });

  it("valt terug op de actuele datum als er geen verzonden datum is", () => {
    expect(
      uitvoerdatumVoorMonteur({ uitvoerdatum: "2026-06-20", gewijzigd_te_versturen: true, verzonden_startdatum: null }),
    ).toBe("2026-06-20");
  });
});
