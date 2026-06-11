import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockMarkeer, mockZoek, mockNotify } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockMarkeer: vi.fn(),
  mockZoek: vi.fn(),
  mockNotify: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getOpdrachtById: mockGetById,
    markeerVerzonden: mockMarkeer,
    zoekOpReferentie: mockZoek,
  }),
}));
vi.mock("@/lib/notificaties", () => ({
  notificeerNieuweOpdrachten: mockNotify,
  notificeerAnnulering: vi.fn(async () => ({ gemaild: true, mailFout: null, gesmst: true, smsFout: null })),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: vi.fn().mockResolvedValue("beheerder-uid") }));

import { POST } from "./route";

const params = Promise.resolve({ id: "opdr-1" });
function req(): Request {
  return new Request("http://localhost/api/opdrachten/opdr-1/mail-monteur", { method: "POST" });
}

describe("POST /api/opdrachten/[id]/mail-monteur", () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockMarkeer.mockReset();
    mockZoek.mockReset();
    mockNotify.mockReset();
    mockMarkeer.mockResolvedValue(undefined);
    mockZoek.mockResolvedValue([]);
    mockNotify.mockResolvedValue({ gemaild: true, mailFout: null, gesmst: true, smsFout: null });
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      monteur_naam: "Piet",
      toegewezen_aan: "piet-uid",
      klant_naam: "Bakker",
      keukenzaak: "Keukenstudio Voorschoten",
      referentienummer: null,
      startdatum: "2026-06-10",
      starttijd: null,
    });
  });

  it("markeert verzonden en notificeert de monteur (mail + SMS) via de dispatcher", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockMarkeer).toHaveBeenCalledWith("opdr-1", {
      toegewezen_aan: "piet-uid",
      monteur_naam: "Piet",
      startdatum: "2026-06-10",
      starttijd: null,
    });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    const arg = mockNotify.mock.calls[0][0];
    expect(arg.toegewezenAan).toBe("piet-uid");
    expect(arg.monteurNaam).toBe("Piet");
  });

  it("400 als er geen monteur is toegewezen, zonder status te zetten of te notificeren", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", monteur_naam: null });
    const res = await POST(req(), { params });
    expect(res.status).toBe(400);
    expect(mockMarkeer).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req(), { params });
    expect(res.status).toBe(404);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("blijft 200 als de notificatie deels faalt (best-effort), met de fout in de body", async () => {
    mockNotify.mockResolvedValue({ gemaild: false, mailFout: "smtp stuk", gesmst: false, smsFout: "sms stuk" });
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.smsFout).toBe("sms stuk");
  });
});
