import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMarkeer, mockGetById, mockZoekRef, mockNotify } = vi.hoisted(() => ({
  mockMarkeer: vi.fn(),
  mockGetById: vi.fn(),
  mockZoekRef: vi.fn(),
  mockNotify: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    markeerVerzonden: mockMarkeer,
    getOpdrachtById: mockGetById,
    zoekOpReferentie: mockZoekRef,
  }),
}));
vi.mock("@/lib/notificaties", () => ({
  notificeerNieuweOpdrachten: mockNotify,
  notificeerOvergenomen: vi.fn(async () => ({ gemaild: true, mailFout: null, gesmst: true, smsFout: null })),
}));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/dashboard/versturen", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/dashboard/versturen", () => {
  beforeEach(() => {
    mockMarkeer.mockReset();
    mockGetById.mockReset();
    mockZoekRef.mockReset();
    mockNotify.mockReset();
    mockMarkeer.mockResolvedValue(undefined);
    mockZoekRef.mockResolvedValue([]);
    mockNotify.mockResolvedValue({ gemaild: true, mailFout: null, gesmst: true, smsFout: null });
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        toegewezen_aan: "piet-uid",
        monteur_naam: "Piet",
        referentienummer: null,
        keukenzaak: "Keukenstudio Voorschoten",
        startdatum: "2026-06-10",
        starttijd: null,
      }),
    );
  });

  it("notificeert gebundeld per monteur en markeert elke opdracht", async () => {
    const res = await POST(req({ ids: ["a", "b"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockNotify).toHaveBeenCalledTimes(1); // beide bij dezelfde monteur = 1 melding
    expect(mockNotify.mock.calls[0][0].toegewezenAan).toBe("piet-uid");
    expect(mockNotify.mock.calls[0][0].opdrachten).toHaveLength(2);
    expect(mockMarkeer).toHaveBeenCalledTimes(2);
    expect(body.aantal).toBe(2);
  });

  it("stuurt aparte meldingen voor verschillende monteurs", async () => {
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        toegewezen_aan: id === "a" ? "piet-uid" : "dani-uid",
        monteur_naam: id === "a" ? "Piet" : "Dani",
        referentienummer: null,
        keukenzaak: "Keukenstudio Voorschoten",
        startdatum: "2026-06-10",
        starttijd: null,
      }),
    );
    await POST(req({ ids: ["a", "b"] }));
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it("lege lijst volgt 400", async () => {
    const res = await POST(req({ ids: [] }));
    expect(res.status).toBe(400);
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("status blijft 200 als de melding faalt; waarschuwing in het antwoord", async () => {
    mockNotify.mockResolvedValue({
      gemaild: false,
      mailFout: "resend down",
      gesmst: false,
      smsFout: null,
    });
    const res = await POST(req({ ids: ["a"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockMarkeer).toHaveBeenCalledTimes(1);
    expect(body.mailWaarschuwing).toContain("resend down");
  });
});
