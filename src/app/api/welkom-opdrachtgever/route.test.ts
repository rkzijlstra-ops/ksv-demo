import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetProfiel, mockBevestig, mockAuthId } = vi.hoisted(() => ({
  mockGetProfiel: vi.fn(),
  mockBevestig: vi.fn(),
  mockAuthId: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ getProfiel: mockGetProfiel, bevestigWelkom: mockBevestig }),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/welkom-opdrachtgever", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/welkom-opdrachtgever", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthId.mockResolvedValue("og-uid");
    mockGetProfiel.mockResolvedValue({ id: "og-uid", rol: "opdrachtgever", naam: "Sandra" });
    mockBevestig.mockResolvedValue(undefined);
  });

  it("opdrachtgever bevestigt: 200, naam + genormaliseerd 06 opgeslagen", async () => {
    const res = await POST(req({ naam: "  Sandra de Vries  ", telefoon: "06-12345678" }));
    expect(res.status).toBe(200);
    expect(mockBevestig).toHaveBeenCalledWith("Sandra de Vries", "+31612345678");
  });

  it("telefoon leeg/ongeldig wordt null (geen blokkade)", async () => {
    await POST(req({ naam: "Sandra", telefoon: "071-1234567" }));
    expect(mockBevestig).toHaveBeenCalledWith("Sandra", null);
  });

  it("lege naam -> 400, niets opgeslagen", async () => {
    const res = await POST(req({ naam: "   ", telefoon: "" }));
    expect(res.status).toBe(400);
    expect(mockBevestig).not.toHaveBeenCalled();
  });

  it("niet ingelogd -> 401", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(req({ naam: "Sandra" }));
    expect(res.status).toBe(401);
  });

  it("een monteur mag dit niet bevestigen -> 403", async () => {
    mockGetProfiel.mockResolvedValue({ id: "og-uid", rol: "monteur", naam: "Jan" });
    const res = await POST(req({ naam: "Jan" }));
    expect(res.status).toBe(403);
    expect(mockBevestig).not.toHaveBeenCalled();
  });
});
