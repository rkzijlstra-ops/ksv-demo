import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockVerstuur, mockMail } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockVerstuur: vi.fn(),
  mockMail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ getOpdrachtById: mockGetById, verstuurNaarMonteurs: mockVerstuur }),
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
    mockVerstuur.mockReset();
    mockMail.mockReset();
    mockVerstuur.mockResolvedValue(undefined);
    mockMail.mockResolvedValue(undefined);
    mockGetById.mockResolvedValue({ id: "opdr-1", monteur_naam: "Rein", klant_naam: "Bakker" });
    process.env.RAPPORT_EMAIL = "rein@example.com";
  });

  it("mailt de opdracht naar de monteur en zet hem op gepland", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockMail).toHaveBeenCalledOnce();
    expect(mockMail.mock.calls[0][0].monteurNaam).toBe("Rein");
    expect(mockVerstuur).toHaveBeenCalledWith(["opdr-1"]);
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
