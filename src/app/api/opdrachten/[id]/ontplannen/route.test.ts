import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOntplan } = vi.hoisted(() => ({ mockOntplan: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: () => ({ ontplanOpdracht: mockOntplan }) }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

const params = Promise.resolve({ id: "opdr-1" });
function req(): Request {
  return new Request("http://localhost/api/opdrachten/opdr-1/ontplannen", { method: "POST" });
}

describe("POST /api/opdrachten/[id]/ontplannen", () => {
  beforeEach(() => {
    mockOntplan.mockReset();
    mockOntplan.mockResolvedValue(undefined);
  });

  it("haalt de opdracht van het bord", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockOntplan).toHaveBeenCalledWith("opdr-1");
  });

  it("503 bij een db-fout", async () => {
    mockOntplan.mockRejectedValue(new Error("kapot"));
    const res = await POST(req(), { params });
    expect(res.status).toBe(503);
  });
});
