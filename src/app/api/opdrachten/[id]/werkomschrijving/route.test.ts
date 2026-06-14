import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockUpdate, mockGetProfiel, mockAuthId } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockAuthId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    updateWerkomschrijving: mockUpdate,
    getProfiel: mockGetProfiel,
  }),
}));

import { PATCH } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new Request("http://x", { method: "PATCH", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("monteur-uid");
  mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "monteur-uid", user_id: "monteur-uid" });
  mockGetProfiel.mockResolvedValue({ id: "monteur-uid", rol: "monteur" });
  mockUpdate.mockResolvedValue(undefined);
});

describe("PATCH /api/opdrachten/[id]/werkomschrijving", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await PATCH(req({ werkomschrijving: "x" }), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 als de klus niet zichtbaar/bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await PATCH(req({ werkomschrijving: "x" }), ctx("weg"));
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("toegewezen monteur mag bewerken: 200 met getrimde tekst", async () => {
    const res = await PATCH(req({ werkomschrijving: "  kasten nastellen  " }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith("opdr-1", "kasten nastellen");
  });

  it("lege tekst wordt null", async () => {
    const res = await PATCH(req({ werkomschrijving: "   " }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith("opdr-1", null);
  });

  it("vreemde monteur (niet zijn klus) wordt geweigerd: 403", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "ander", user_id: "ander" });
    const res = await PATCH(req({ werkomschrijving: "x" }), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("kantoor (beheerder) mag bewerken ook al is hij niet toegewezen: 200", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "ander", user_id: "ander" });
    mockGetProfiel.mockResolvedValue({ id: "monteur-uid", rol: "beheerder" });
    const res = await PATCH(req({ werkomschrijving: "x" }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith("opdr-1", "x");
  });
});
