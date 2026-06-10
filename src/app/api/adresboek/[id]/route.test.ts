import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockWerkBij, mockVerwijder } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockWerkBij: vi.fn(),
  mockVerwijder: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ werkAdresBij: mockWerkBij, verwijderAdres: mockVerwijder }),
}));

import { PATCH, DELETE } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function patchReq(body: unknown) {
  return new Request("http://localhost/api/adresboek/a1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("u1");
  mockWerkBij.mockResolvedValue(undefined);
  mockVerwijder.mockResolvedValue(undefined);
});

describe("PATCH /api/adresboek/[id]", () => {
  it("401 zonder login", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await PATCH(patchReq({ naam: "Ed", email: "ed@ksv.nl" }), ctx("a1"));
    expect(res.status).toBe(401);
    expect(mockWerkBij).not.toHaveBeenCalled();
  });

  it("werkt een geldig adres bij (200), getrimd", async () => {
    const res = await PATCH(patchReq({ naam: "  Ed  ", email: " ed@ksv.nl " }), ctx("a1"));
    expect(res.status).toBe(200);
    expect(mockWerkBij).toHaveBeenCalledWith("a1", "Ed", "ed@ksv.nl");
  });

  it("400 bij ongeldige invoer", async () => {
    expect((await PATCH(patchReq({ naam: "Ed", email: "geen" }), ctx("a1"))).status).toBe(400);
    expect(mockWerkBij).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/adresboek/[id]", () => {
  it("401 zonder login", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await DELETE(new Request("http://x"), ctx("a1"));
    expect(res.status).toBe(401);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("verwijdert een adres (200)", async () => {
    const res = await DELETE(new Request("http://x"), ctx("a1"));
    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("a1");
  });
});
