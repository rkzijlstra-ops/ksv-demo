import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGetProfiel, mockGetOpdracht, mockOntplan, mockNotify } = vi.hoisted(
  () => ({
    mockAuthId: vi.fn(),
    mockGetProfiel: vi.fn(),
    mockGetOpdracht: vi.fn(),
    mockOntplan: vi.fn(),
    mockNotify: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getProfiel: mockGetProfiel,
    getOpdrachtById: mockGetOpdracht,
    ontplanOpdracht: mockOntplan,
  }),
}));
vi.mock("@/lib/notificaties", () => ({ notificeerOntplanning: mockNotify }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const verstuurd = {
  id: "opdr-1",
  klant_naam: "Fam. Bakker",
  referentienummer: "7588",
  keukenzaak: "Keukenstudio Voorschoten",
  dashboard_status: "bevestigd",
  toegewezen_aan: "rk-uid",
  monteur_naam: "Rein RK",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("kantoor-uid");
  mockGetProfiel.mockResolvedValue({ rol: "beheerder" });
  mockGetOpdracht.mockResolvedValue({ ...verstuurd });
  mockOntplan.mockResolvedValue(undefined);
  mockNotify.mockResolvedValue({ gemaild: true, mailFout: null, gesmst: true, smsFout: null });
});

describe("POST /api/opdrachten/[id]/ontplannen", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockOntplan).not.toHaveBeenCalled();
  });

  it("403 voor een monteur", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockOntplan).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetOpdracht.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("weg"));
    expect(res.status).toBe(404);
    expect(mockOntplan).not.toHaveBeenCalled();
  });

  it("ontplant en notificeert de monteur als de klus al verstuurd/bevestigd was", async () => {
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockOntplan).toHaveBeenCalledWith("opdr-1");
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      toegewezenAan: "rk-uid",
      monteurNaam: "Rein RK",
      klantNaam: "Fam. Bakker",
      referentienummer: "7588",
    });
    expect((await res.json()).gemaild).toBe(true);
  });

  it("notificeert ook bij status 'gepland' (verstuurd, nog niet bevestigd)", async () => {
    mockGetOpdracht.mockResolvedValue({ ...verstuurd, dashboard_status: "gepland" });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("ontplant ZONDER notificatie als de klus nog niet verstuurd was (concept_gepland)", async () => {
    mockGetOpdracht.mockResolvedValue({ ...verstuurd, dashboard_status: "concept_gepland" });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockOntplan).toHaveBeenCalledWith("opdr-1");
    expect(mockNotify).not.toHaveBeenCalled();
    expect((await res.json()).gemaild).toBe(false);
  });

  it("ontplant tóch (200) als de notificatie faalt, met mailFout in het antwoord", async () => {
    mockNotify.mockResolvedValue({ gemaild: false, mailFout: "resend down", gesmst: false, smsFout: null });
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockOntplan).toHaveBeenCalledWith("opdr-1");
    const body = await res.json();
    expect(body.gemaild).toBe(false);
    expect(body.mailFout).toContain("resend down");
  });

  it("503 bij een db-fout tijdens ontplannen", async () => {
    mockOntplan.mockRejectedValue(new Error("kapot"));
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(503);
  });
});
