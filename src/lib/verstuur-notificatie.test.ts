import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Db, Melding } from "./db";

type Result = { gemaild: boolean; mailFout: string | null; gesmst: boolean; smsFout: string | null };

const { mockNieuw, mockAnnuleer, mockZoek } = vi.hoisted(() => ({
  mockNieuw: vi.fn(
    async (_i: {
      toegewezenAan: string | null;
      monteurNaam: string;
      opdrachten: Array<{ verzet?: boolean }>;
      zaaknaam: string | null;
    }): Promise<Result> => ({ gemaild: true, mailFout: null, gesmst: true, smsFout: null }),
  ),
  mockAnnuleer: vi.fn(
    async (_i: {
      toegewezenAan: string | null;
      monteurNaam: string;
      klantNaam: string;
      referentienummer: string | null;
      zaaknaam: string | null;
    }): Promise<Result> => ({ gemaild: true, mailFout: null, gesmst: true, smsFout: null }),
  ),
  mockZoek: vi.fn(async () => []),
}));
vi.mock("./notificaties", () => ({
  notificeerNieuweOpdrachten: mockNieuw,
  notificeerAnnulering: mockAnnuleer,
}));

import { meldVerstuurd } from "./verstuur-notificatie";

const dbi = { zoekOpReferentie: mockZoek } as unknown as Pick<Db, "zoekOpReferentie">;

function opdr(over: Record<string, unknown>): Melding {
  return {
    id: "o1",
    toegewezen_aan: "B",
    monteur_naam: "Bob",
    verzonden_toegewezen_aan: null,
    verzonden_monteur: null,
    klant_naam: "Klant",
    referentienummer: null,
    keukenzaak: "KSV",
    startdatum: "2026-06-15",
    starttijd: null,
    duur_dagen: 1,
    documenttype: "orderbevestiging",
    meldingen: [],
    ...over,
  } as unknown as Melding;
}

describe("meldVerstuurd", () => {
  beforeEach(() => vi.clearAllMocks());

  it("nieuwe klus: meldt de monteur zonder verzet-toon en zonder annulering aan een vorige monteur", async () => {
    await meldVerstuurd(dbi, [opdr({ verzonden_toegewezen_aan: null })]);
    expect(mockNieuw).toHaveBeenCalledOnce();
    expect(mockNieuw.mock.calls[0][0].opdrachten[0].verzet).toBe(false);
    expect(mockAnnuleer).not.toHaveBeenCalled();
  });

  it("verzetting (zelfde monteur, eerder verstuurd): zet de verzet-toon, geen annulering", async () => {
    await meldVerstuurd(dbi, [
      opdr({ toegewezen_aan: "B", verzonden_toegewezen_aan: "B", verzonden_monteur: "Bob" }),
    ]);
    expect(mockNieuw.mock.calls[0][0].opdrachten[0].verzet).toBe(true);
    expect(mockAnnuleer).not.toHaveBeenCalled();
  });

  it("monteur-wissel: nieuwe monteur krijgt 'nieuw', vorige monteur krijgt de annulering-melding", async () => {
    await meldVerstuurd(dbi, [
      opdr({
        toegewezen_aan: "B",
        monteur_naam: "Bob",
        verzonden_toegewezen_aan: "A",
        verzonden_monteur: "Anna",
      }),
    ]);
    // Nieuwe monteur B: nieuw (geen verzet, want hij had de klus nog niet).
    expect(mockNieuw.mock.calls[0][0].toegewezenAan).toBe("B");
    expect(mockNieuw.mock.calls[0][0].opdrachten[0].verzet).toBe(false);
    // Vorige monteur A: voor hem is de klus geannuleerd.
    expect(mockAnnuleer).toHaveBeenCalledOnce();
    expect(mockAnnuleer.mock.calls[0][0].toegewezenAan).toBe("A");
    expect(mockAnnuleer.mock.calls[0][0].monteurNaam).toBe("Anna");
  });
});
