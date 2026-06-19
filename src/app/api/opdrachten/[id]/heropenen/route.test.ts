import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGetById, mockGetProfiel, mockHeropenen, mockLog } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGetById: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockHeropenen: vi.fn(),
  mockLog: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ getMeldingById: mockGetById, getProfiel: mockGetProfiel }),
  dbAdmin: () => ({ heropenen: mockHeropenen }),
}));
vi.mock("@/lib/gebeurtenis", () => ({ logActie: mockLog }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(body?: unknown) {
  return new Request("http://localhost/api/opdrachten/opdr-1/heropenen", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("u1");
  mockGetProfiel.mockResolvedValue({ id: "u1", rol: "beheerder", naam: "Kantoor" });
  mockHeropenen.mockResolvedValue(undefined);
  mockLog.mockResolvedValue(undefined);
});

describe("POST /api/opdrachten/[id]/heropenen", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(req({}), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockHeropenen).not.toHaveBeenCalled();
  });

  it("404 als de klus niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req({}), ctx("weg"));
    expect(res.status).toBe(404);
  });

  it("403 als een monteur die niet is toegewezen het probeert", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", opdracht_status: "opgeleverd", toegewezen_aan: "andere" });
    mockGetProfiel.mockResolvedValue({ id: "u1", rol: "monteur", naam: "Mont" });
    const res = await POST(req({}), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockHeropenen).not.toHaveBeenCalled();
  });

  it("400 als de klus nog actief is (niet afgerond én niet opgeleverd)", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", opdracht_status: "open", afgerond_door_monteur_at: null });
    const res = await POST(req({}), ctx("opdr-1"));
    expect(res.status).toBe(400);
    expect(mockHeropenen).not.toHaveBeenCalled();
  });

  it("heropent een opgeleverde klus mét instructie, 200", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", opdracht_status: "opgeleverd", afgerond_door_monteur_at: null });
    const res = await POST(req({ instructie: "  lade afstellen " }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockHeropenen).toHaveBeenCalledWith("opdr-1", "lade afstellen");
    expect(mockLog).toHaveBeenCalledWith(
      expect.anything(),
      "opdr-1",
      "heropend",
      expect.objectContaining({ id: "u1" }),
      { instructie: "lade afstellen" },
    );
  });

  it("heropent ook een snel-afgeronde klus (Toch nog open), zonder instructie, 200", async () => {
    // opdracht_status nog "open" maar afgerond gemeld: dit is de bestaande AfgerondKeuren-flow.
    mockGetById.mockResolvedValue({ id: "opdr-1", opdracht_status: "open", afgerond_door_monteur_at: "2026-06-18T10:00:00Z" });
    const res = await POST(req({}), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockHeropenen).toHaveBeenCalledWith("opdr-1", null);
  });
});
