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
      duur_dagen: 2,
      verzonden_toegewezen_aan: "rein-uid",
      verzonden_monteur: "Rein",
      verzonden_startdatum: "2026-06-10",
      verzonden_starttijd: null,
    });
  });

  it("verplaatst met de status en verzonden plek uit de opdracht (niet van de client)", async () => {
    const res = await POST(
      req({
        toegewezen_aan: "dani-uid",
        monteur_naam: "Dani",
        startdatum: "2026-06-11",
        starttijd: "10:00",
        duur_dagen: 1,
      }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(mockWijzig).toHaveBeenCalledWith(
      "opdr-1",
      {
        toegewezen_aan: "dani-uid",
        monteur_naam: "Dani",
        startdatum: "2026-06-11",
        starttijd: "10:00",
        duur_dagen: 1,
      },
      "gepland",
      { toegewezen_aan: "rein-uid", monteur_naam: "Rein", startdatum: "2026-06-10", starttijd: null },
      2, // de vorige duur uit de opdracht, zodat de server een resize kan herkennen
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

  it("behoudt duur, tijd en monteur als die niet worden meegestuurd", async () => {
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      dashboard_status: "gepland",
      toegewezen_aan: "m1",
      monteur_naam: "Jan",
      starttijd: "09:00",
      duur_dagen: 3,
      verzonden_monteur: null,
      verzonden_startdatum: null,
      verzonden_starttijd: null,
    });
    const res = await POST(req({ startdatum: "2026-06-11" }), { params });
    expect(res.status).toBe(200);
    const planning = mockWijzig.mock.calls[0][1];
    expect(planning.startdatum).toBe("2026-06-11");
    expect(planning.duur_dagen).toBe(3); // niet teruggezet naar 1
    expect(planning.starttijd).toBe("09:00"); // niet gewist
    expect(planning.toegewezen_aan).toBe("m1");
    expect(planning.monteur_naam).toBe("Jan");
  });

  it("wist de tijd als starttijd expliciet null is", async () => {
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      dashboard_status: "gepland",
      toegewezen_aan: "m1",
      monteur_naam: "Jan",
      starttijd: "09:00",
      duur_dagen: 3,
    });
    await POST(req({ startdatum: "2026-06-11", starttijd: null }), { params });
    expect(mockWijzig.mock.calls[0][1].starttijd).toBeNull();
  });
});
