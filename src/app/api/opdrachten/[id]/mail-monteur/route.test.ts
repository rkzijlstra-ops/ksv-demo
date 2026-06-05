import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockMarkeer, mockMail, mockEmail } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockMarkeer: vi.fn(),
  mockMail: vi.fn(),
  mockEmail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ getOpdrachtById: mockGetById, markeerVerzonden: mockMarkeer }),
}));
vi.mock("@/lib/mail", () => ({ verstuurMonteurMail: mockMail }));
vi.mock("@/lib/supabase-admin", () => ({ getGebruikerEmail: mockEmail }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: vi.fn().mockResolvedValue("beheerder-uid") }));

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
    mockEmail.mockReset();
    mockMarkeer.mockResolvedValue(undefined);
    mockMail.mockResolvedValue(undefined);
    mockEmail.mockResolvedValue("piet@monteur.nl");
    mockGetById.mockResolvedValue({
      id: "opdr-1",
      monteur_naam: "Piet",
      toegewezen_aan: "piet-uid",
      klant_naam: "Bakker",
      startdatum: "2026-06-10",
      starttijd: null,
    });
    process.env.RAPPORT_EMAIL = "rein@example.com";
  });

  it("mailt naar het adres van de monteur en markeert verzonden", async () => {
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockEmail).toHaveBeenCalledWith("piet-uid");
    expect(mockMail.mock.calls[0][0].naar).toBe("piet@monteur.nl");
    expect(mockMarkeer).toHaveBeenCalledWith("opdr-1", {
      toegewezen_aan: "piet-uid",
      monteur_naam: "Piet",
      startdatum: "2026-06-10",
      starttijd: null,
    });
  });

  it("valt terug op RAPPORT_EMAIL als de monteur geen adres heeft", async () => {
    mockEmail.mockResolvedValue(null);
    const res = await POST(req(), { params });
    expect(res.status).toBe(200);
    expect(mockMail.mock.calls[0][0].naar).toBe("rein@example.com");
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

  it("500 als noch monteur-adres noch RAPPORT_EMAIL bekend is", async () => {
    mockEmail.mockResolvedValue(null);
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req(), { params });
    expect(res.status).toBe(500);
  });
});
