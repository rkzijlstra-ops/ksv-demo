import { describe, it, expect } from "vitest";
import {
  ALLE_STATUSSEN,
  statusStijl,
  isActief,
  opVerzondenPlek,
  type DashboardStatusStijl,
} from "./opdracht-status";
import type { DashboardStatus } from "./db";

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
