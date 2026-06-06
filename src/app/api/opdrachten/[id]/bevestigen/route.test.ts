import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockBevestig, mockAuthId } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockBevestig: vi.fn(),
  mockAuthId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ getMeldingById: mockGetById, bevestigOntvangst: mockBevestig }),
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("monteur-uid");
  mockGetById.mockResolvedValue({ id: "opdr-1", dashboard_status: "gepland" });
  mockBevestig.mockResolvedValue(undefined);
});

describe("POST /api/opdrachten/[id]/bevestigen", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockBevestig).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet zichtbaar/bestaat (RLS)", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("weg"));
    expect(res.status).toBe(404);
    expect(mockBevestig).not.toHaveBeenCalled();
  });

  it("bevestigt de ontvangst en geeft 200", async () => {
    const res = await POST(new Request("http://x"), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockBevestig).toHaveBeenCalledWith("opdr-1");
  });
});
