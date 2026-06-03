import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerstuur } = vi.hoisted(() => ({ mockVerstuur: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: () => ({ verstuurNaarMonteurs: mockVerstuur }) }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/dashboard/versturen", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/dashboard/versturen", () => {
  beforeEach(() => {
    mockVerstuur.mockReset();
    mockVerstuur.mockResolvedValue(undefined);
  });

  it("verstuurt de opgegeven ids", async () => {
    const res = await POST(req({ ids: ["a", "b"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockVerstuur).toHaveBeenCalledWith(["a", "b"]);
    expect(body.aantal).toBe(2);
  });

  it("lege lijst volgt 400", async () => {
    const res = await POST(req({ ids: [] }));
    expect(res.status).toBe(400);
    expect(mockVerstuur).not.toHaveBeenCalled();
  });

  it("503 bij een db-fout", async () => {
    mockVerstuur.mockRejectedValue(new Error("db kapot"));
    const res = await POST(req({ ids: ["a"] }));
    expect(res.status).toBe(503);
  });
});
