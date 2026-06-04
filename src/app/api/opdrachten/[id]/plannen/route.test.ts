import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPlan } = vi.hoisted(() => ({ mockPlan: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: () => ({ planOpdracht: mockPlan }) }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/opdrachten/opdr-1/plannen", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: "opdr-1" });

describe("POST /api/opdrachten/[id]/plannen", () => {
  beforeEach(() => {
    mockPlan.mockReset();
    mockPlan.mockResolvedValue(undefined);
  });

  it("plant met monteur, datum, dagen en tijd", async () => {
    const res = await POST(
      req({
        toegewezen_aan: "rein-uid",
        monteur_naam: "Rein",
        startdatum: "2026-06-10",
        duur_dagen: 2,
        starttijd: "10:00",
      }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(mockPlan).toHaveBeenCalledWith("opdr-1", {
      toegewezen_aan: "rein-uid",
      monteur_naam: "Rein",
      startdatum: "2026-06-10",
      starttijd: "10:00",
      duur_dagen: 2,
    });
  });

  it("lege tijd wordt null (dagblok); ontbrekende duur wordt 1", async () => {
    await POST(req({ monteur_naam: "Rein", startdatum: "2026-06-10" }), { params });
    const arg = mockPlan.mock.calls[0][1];
    expect(arg.starttijd).toBeNull();
    expect(arg.duur_dagen).toBe(1);
  });

  it("zonder startdatum volgt 400", async () => {
    const res = await POST(req({ monteur_naam: "Rein" }), { params });
    expect(res.status).toBe(400);
    expect(mockPlan).not.toHaveBeenCalled();
  });

  it("503 bij een db-fout", async () => {
    mockPlan.mockRejectedValue(new Error("db kapot"));
    const res = await POST(req({ startdatum: "2026-06-10" }), { params });
    expect(res.status).toBe(503);
  });
});
