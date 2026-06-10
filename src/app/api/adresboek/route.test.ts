import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGet, mockVoegToe } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGet: vi.fn(),
  mockVoegToe: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ getAdresboek: mockGet, voegAdresToe: mockVoegToe }),
}));

import { GET, POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/adresboek", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("u1");
  mockGet.mockResolvedValue([{ id: "a1", naam: "Ed", email: "ed@ksv.nl" }]);
  mockVoegToe.mockResolvedValue({ id: "nieuw" });
});

describe("GET /api/adresboek", () => {
  it("401 zonder login", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("geeft de eigen adressen terug", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).adressen).toHaveLength(1);
  });
});

describe("POST /api/adresboek", () => {
  it("401 zonder login", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(req({ naam: "Ed", email: "ed@ksv.nl" }));
    expect(res.status).toBe(401);
    expect(mockVoegToe).not.toHaveBeenCalled();
  });

  it("slaat een geldig adres op (200) en trimt", async () => {
    const res = await POST(req({ naam: "  Ed  ", email: "  ed@ksv.nl " }));
    expect(res.status).toBe(200);
    expect(mockVoegToe).toHaveBeenCalledWith("Ed", "ed@ksv.nl");
  });

  it("400 bij ontbrekende naam of ongeldig e-mailadres", async () => {
    expect((await POST(req({ naam: "", email: "ed@ksv.nl" }))).status).toBe(400);
    expect((await POST(req({ naam: "Ed", email: "geen-mail" }))).status).toBe(400);
    expect(mockVoegToe).not.toHaveBeenCalled();
  });
});
