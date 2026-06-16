import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockKiesAdres, mockGetProfiel, mockAuthId } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockKiesAdres: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockAuthId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    kiesAdres: mockKiesAdres,
    getProfiel: mockGetProfiel,
  }),
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("monteur-uid");
  mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "monteur-uid", user_id: "monteur-uid" });
  mockGetProfiel.mockResolvedValue({ id: "monteur-uid", rol: "monteur" });
  mockKiesAdres.mockResolvedValue(undefined);
});

describe("POST /api/opdrachten/[id]/adres", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(req({ adres: "Straat 1" }), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockKiesAdres).not.toHaveBeenCalled();
  });

  it("404 als de klus niet bestaat/zichtbaar is", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req({ adres: "Straat 1" }), ctx("weg"));
    expect(res.status).toBe(404);
    expect(mockKiesAdres).not.toHaveBeenCalled();
  });

  it("400 bij een leeg adres", async () => {
    const res = await POST(req({ adres: "   " }), ctx("opdr-1"));
    expect(res.status).toBe(400);
    expect(mockKiesAdres).not.toHaveBeenCalled();
  });

  it("toegewezen monteur kiest het adres: 200, getrimd opgeslagen", async () => {
    const res = await POST(req({ adres: "  Marshalllaan 2, 2215 NZ Voorhout  " }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockKiesAdres).toHaveBeenCalledWith("opdr-1", "Marshalllaan 2, 2215 NZ Voorhout");
  });

  it("vreemde monteur (niet zijn klus) wordt geweigerd: 403", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "ander", user_id: "ander" });
    const res = await POST(req({ adres: "Straat 1" }), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockKiesAdres).not.toHaveBeenCalled();
  });

  it("kantoor (planner/beheerder) mag altijd kiezen, ook niet-toegewezen: 200", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "ander", user_id: "ander" });
    mockGetProfiel.mockResolvedValue({ id: "monteur-uid", rol: "beheerder" });
    const res = await POST(req({ adres: "Straat 1" }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockKiesAdres).toHaveBeenCalledWith("opdr-1", "Straat 1");
  });
});
