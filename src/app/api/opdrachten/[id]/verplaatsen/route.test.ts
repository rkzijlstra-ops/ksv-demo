import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWijzig, mockGetById } = vi.hoisted(() => ({
  mockWijzig: vi.fn(),
  mockGetById: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ wijzigOpdracht: mockWijzig, getOpdrachtById: mockGetById }),
}));
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
    mockGetById.mockReset();
    mockWijzig.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      dashboard_status: "gepland",
      verzonden_monteur: "Rein",
      verzonden_startdatum: "2026-06-10",
      verzonden_starttijd: null,
    });
  });

  it("verplaatst met de status en verzonden plek uit de opdracht (niet van de client)", async () => {
    const res = await POST(
      req({ monteur_naam: "Dani", startdatum: "2026-06-11", starttijd: "10:00", duur_dagen: 1 }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(mockWijzig).toHaveBeenCalledWith(
      "opdr-1",
      { monteur_naam: "Dani", startdatum: "2026-06-11", starttijd: "10:00", duur_dagen: 1 },
      "gepland",
      { monteur_naam: "Rein", startdatum: "2026-06-10", starttijd: null },
    );
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req({ startdatum: "2026-06-11" }), { params });
    expect(res.status).toBe(404);
    expect(mockWijzig).not.toHaveBeenCalled();
  });

  it("zonder startdatum volgt 400", async () => {
    const res = await POST(req({ monteur_naam: "Dani" }), { params });
    expect(res.status).toBe(400);
    expect(mockWijzig).not.toHaveBeenCalled();
  });
});
