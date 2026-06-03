import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWijzig } = vi.hoisted(() => ({ mockWijzig: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: () => ({ wijzigOpdracht: mockWijzig }) }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/opdrachten/opdr-1/verplaatsen", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: "opdr-1" });

describe("POST /api/opdrachten/[id]/verplaatsen", () => {
  beforeEach(() => {
    mockWijzig.mockReset();
    mockWijzig.mockResolvedValue(undefined);
  });

  it("verplaatst met behoud van tijd/duur en geeft de huidige status door", async () => {
    const res = await POST(
      req({
        toegewezen_aan: "Dani",
        startdatum: "2026-06-11",
        starttijd: "10:00",
        duur_dagen: 1,
        huidigeStatus: "gepland",
      }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(mockWijzig).toHaveBeenCalledWith(
      "opdr-1",
      { toegewezen_aan: "Dani", startdatum: "2026-06-11", starttijd: "10:00", duur_dagen: 1 },
      "gepland",
    );
  });

  it("valt terug op concept_gepland bij een onbekende status", async () => {
    await POST(req({ startdatum: "2026-06-11", huidigeStatus: "rommel" }), { params });
    expect(mockWijzig.mock.calls[0][2]).toBe("concept_gepland");
  });

  it("zonder startdatum volgt 400", async () => {
    const res = await POST(req({ toegewezen_aan: "Dani" }), { params });
    expect(res.status).toBe(400);
    expect(mockWijzig).not.toHaveBeenCalled();
  });
});
