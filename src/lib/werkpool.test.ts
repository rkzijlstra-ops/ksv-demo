import { describe, it, expect } from "vitest";
import { groepeerMeldingen } from "./werkpool";
import type { Melding } from "./db";

function maakMelding(over: Partial<Melding>): Melding {
  return {
    id: "x",
    created_at: "2026-05-28T10:00:00Z",
    bron: "pdf",
    urgentie: null,
    klant_naam: "Test",
    klant_adres: null,
    referentienummer: null,
    adviseur: null,
    klant_telefoon: null,
    meldingen: [],
    foto_urls: [],
    spraak_tekst: null,
    ruwe_tekst: null,
    status: "concept",
    aangepast: false,
    verzonden_at: null,
    uitvoerdatum: null,
    opdracht_id: null,
    versie: 1,
    documenttype: "werkbon_service",
    leverweek: null,
    keukenzaak: null,
    opdracht_status: "open",
    opgeleverd_at: null,
    rapport_url: null,
    spoed: false,
    spoed_verzonden_at: null,
    verwijderd_at: null,
    dashboard_status: "binnen",
    ...over,
  };
}

describe("groepeerMeldingen", () => {
  it("zet verzonden in history, rest in actief", () => {
    const rows = [
      maakMelding({ id: "1", status: "concept" }),
      maakMelding({ id: "2", status: "verzonden" }),
      maakMelding({ id: "3", status: "concept", bron: "monteur" }),
    ];
    const { actief, history } = groepeerMeldingen(rows);

    expect(actief.map((m) => m.id)).toEqual(["1", "3"]);
    expect(history.map((m) => m.id)).toEqual(["2"]);
  });

  it("opgeleverde opdracht hoort in history, ook als melding-status concept is", () => {
    const rows = [
      maakMelding({ id: "a", status: "concept", opdracht_status: "open" }),
      maakMelding({ id: "b", status: "concept", opdracht_status: "opgeleverd" }),
    ];
    const { actief, history } = groepeerMeldingen(rows);

    expect(actief.map((m) => m.id)).toEqual(["a"]);
    expect(history.map((m) => m.id)).toEqual(["b"]);
  });

  it("lege input geeft lege groepen", () => {
    const { actief, history } = groepeerMeldingen([]);
    expect(actief).toEqual([]);
    expect(history).toEqual([]);
  });

  it("verbergt geannuleerde klussen uit de monteur-werkpool (gat 2)", () => {
    const rows = [
      maakMelding({ id: "a", dashboard_status: "bevestigd" }),
      maakMelding({ id: "geann", dashboard_status: "geannuleerd" }),
    ];
    const { actief, history } = groepeerMeldingen(rows);
    expect(actief.map((m) => m.id)).toEqual(["a"]);
    expect(history.map((m) => m.id)).toEqual([]); // geannuleerd nergens zichtbaar
  });

  it("verbergt een nog niet verstuurd concept (concept_gepland) uit de werkpool (gat 3)", () => {
    const rows = [
      maakMelding({ id: "eigen", dashboard_status: "binnen" }),
      maakMelding({ id: "concept", dashboard_status: "concept_gepland" }),
      maakMelding({ id: "verstuurd", dashboard_status: "gepland" }),
    ];
    const { actief } = groepeerMeldingen(rows);
    // Eigen (binnen) en verstuurd (gepland) blijven; het kantoor-concept is verborgen.
    expect(actief.map((m) => m.id)).toEqual(["eigen", "verstuurd"]);
  });

  it("behoudt volgorde binnen elke groep", () => {
    const rows = [
      maakMelding({ id: "a", status: "verzonden" }),
      maakMelding({ id: "b", status: "verzonden" }),
    ];
    const { history } = groepeerMeldingen(rows);
    expect(history.map((m) => m.id)).toEqual(["a", "b"]);
  });
});
