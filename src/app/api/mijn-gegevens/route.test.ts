import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockUpdate } = vi.hoisted(() => ({ mockAuthId: vi.fn(), mockUpdate: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({ db: () => ({ updateEigenGegevens: mockUpdate }) }));

import { PATCH } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/mijn-gegevens", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("u1");
  mockUpdate.mockResolvedValue(undefined);
});

describe("PATCH /api/mijn-gegevens", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await PATCH(req({ bedrijfsnaam: "X" }));
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("slaat de getrimde velden op, leeg wordt null", async () => {
    const res = await PATCH(req({ bedrijfsnaam: "  BKM Keukenmontage  ", telefoon: "", contact_email: "a@b.nl" }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      bedrijfsnaam: "BKM Keukenmontage",
      telefoon: null,
      contact_email: "a@b.nl",
    });
  });

  it("503 als de db-update faalt", async () => {
    mockUpdate.mockRejectedValue(new Error("rpc weg"));
    const res = await PATCH(req({ bedrijfsnaam: "X" }));
    expect(res.status).toBe(503);
  });
});
