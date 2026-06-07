import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGetProfiel, mockGetOpdracht, mockAnnuleer, mockNotify } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockGetOpdracht: vi.fn(),
  mockAnnuleer: vi.fn(),
  mockNotify: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ getProfiel: mockGetProfiel, getOpdrachtById: mockGetOpdracht, annuleerOpdracht: mockAnnuleer }),
}));
vi.mock("@/lib/notificaties", () => ({ notificeerAnnulering: mockNotify }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const verstuurd = {
  id: "opdr-1",
  klant_naam: "Fam. Bakker",
  referentienummer: "7588",
  keukenzaak: "Keukenstudio Voorschoten",
  dashboard_status: "gepland",
  toegewezen_aan: "rk-uid",
  monteur_naam: "Rein RK",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("kantoor-uid");
  mockGetProfiel.mockResolvedValue({ rol: "beheerder" });
  mockGetOpdracht.mockResolvedValue({ ...verstuurd });
  mockAnnuleer.mockResolvedValue(undefined);
  mockNotify.mockResolvedValue({ gemaild: true, mailFout: null, gesmst: true, smsFout: null });
});

describe("POST /api/opdrachten/[id]/annuleren", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockAnnuleer).not.toHaveBeenCalled();
  });

  it("403 voor een monteur", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockAnnuleer).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetOpdracht.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("weg"));
    expect(res.status).toBe(404);
  });

  it("annuleert en notificeert de monteur als de klus al verstuurd was", async () => {
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockAnnuleer).toHaveBeenCalledWith("opdr-1");
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      toegewezenAan: "rk-uid",
      monteurNaam: "Rein RK",
      klantNaam: "Fam. Bakker",
      referentienummer: "7588",
    });
    expect((await res.json()).gemaild).toBe(true);
  });

  it("annuleert ZONDER notificatie als de klus nog niet verstuurd was", async () => {
    mockGetOpdracht.mockResolvedValue({ ...verstuurd, dashboard_status: "binnen", toegewezen_aan: null, monteur_naam: null });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockAnnuleer).toHaveBeenCalledWith("opdr-1");
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("annuleert tóch (200) als de notificatie faalt, met mailFout in het antwoord", async () => {
    mockNotify.mockResolvedValue({ gemaild: false, mailFout: "resend down", gesmst: false, smsFout: null });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockAnnuleer).toHaveBeenCalledWith("opdr-1");
    const body = await res.json();
    expect(body.gemaild).toBe(false);
    expect(body.mailFout).toContain("resend down");
  });
});
