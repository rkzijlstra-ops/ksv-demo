import { describe, it, expect } from "vitest";
import {
  ALLE_STATUSSEN,
  statusStijl,
  isActief,
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
