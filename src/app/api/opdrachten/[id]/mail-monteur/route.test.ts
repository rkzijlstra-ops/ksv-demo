import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockMarkeer, mockMail } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockMarkeer: vi.fn(),
  mockMail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ getOpdrachtById: mockGetById, markeerVerzonden: mockMarkeer }),
}));
vi.mock("@/lib/mail", () => ({ verstuurMonteurMail: mockMail }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

const params = Promise.resolve({ id: "opdr-1" });
function req(): Request {
  return new Request("http://localhost/api/opdrachten/opdr-1/mail-monteur", { method: "POST" });
}

describe("POST /api/opdrachten/[id]/mail-monteur", () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockMarkeer.mockReset();
    mockMail.mockReset();
    mockMarkeer.mockResolvedValue(undefined);
    mockMail.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      monteur_naam: "Rein",
      klant_naam: "Bakker",
      startdatum: "2026-06-10",
      starttijd: null,
    });
    process.env.RAPPORT_EMAIL = "rein@example.com";
  });

  it("mailt de opdracht naar de monteur en markeert hem als verzonden", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockMail).toHaveBeenCalledOnce();
    expect(mockMail.mock.calls[0][0].monteurNaam).toBe("Rein");
    expect(mockMarkeer).toHaveBeenCalledWith("opdr-1", {
      monteur_naam: "Rein",
      startdatum: "2026-06-10",
      starttijd: null,
    });
  });

  it("400 als er geen monteur is toegewezen", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", monteur_naam: null });
    const res = await POST(req(), { params });
    expect(res.status).toBe(400);
    expect(mockMail).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req(), { params });
    expect(res.status).toBe(404);
  });

  it("500 als RAPPORT_EMAIL ontbreekt", async () => {
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req(), { params });
    expect(res.status).toBe(500);
  });
});
