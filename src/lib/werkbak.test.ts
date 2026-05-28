import { describe, it, expect } from "vitest";
import { groepeerMeldingen } from "./werkbak";
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

  it("lege input geeft lege groepen", () => {
    const { actief, history } = groepeerMeldingen([]);
    expect(actief).toEqual([]);
    expect(history).toEqual([]);
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
