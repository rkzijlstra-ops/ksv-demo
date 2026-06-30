import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetProfiel, mockInsert } = vi.hoisted(() => ({
  mockGetProfiel: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ getProfiel: mockGetProfiel, insertOpdrachtgever: mockInsert }),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: vi.fn().mockResolvedValue("beheerder-uid") }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/opdrachtgevers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/opdrachtgevers", () => {
  beforeEach(() => {
    mockGetProfiel.mockReset();
    mockInsert.mockReset();
    mockGetProfiel.mockResolvedValue({ id: "beheerder-uid", rol: "beheerder" });
    mockInsert.mockResolvedValue({ id: "z-nieuw", naam: "Keukenhal Lisse", klant_levering_toegestaan: true });
  });

  it("beheerder maakt een opdrachtgever aan: 200 + de aangemaakte zaak", async () => {
    const res = await POST(req({ naam: "Keukenhal Lisse" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith("Keukenhal Lisse");
    expect(body.opdrachtgever.id).toBe("z-nieuw");
  });

  it("trimt de naam", async () => {
    await POST(req({ naam: "  Keukenhal Lisse  " }));
    expect(mockInsert).toHaveBeenCalledWith("Keukenhal Lisse");
  });

  it("lege naam → 400, niets aangemaakt", async () => {
    const res = await POST(req({ naam: "   " }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("niet-beheerder → 403", async () => {
    mockGetProfiel.mockResolvedValue({ id: "x", rol: "opdrachtgever" });
    const res = await POST(req({ naam: "Keukenhal Lisse" }));
    expect(res.status).toBe(403);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("niet ingelogd → 401", async () => {
    const { getAuthenticatedUserId } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedUserId).mockResolvedValueOnce(null);
    const res = await POST(req({ naam: "Keukenhal Lisse" }));
    expect(res.status).toBe(401);
  });
});
