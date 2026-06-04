import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMarkeer, mockGetById, mockMail, mockEmail } = vi.hoisted(() => ({
  mockMarkeer: vi.fn(),
  mockGetById: vi.fn(),
  mockMail: vi.fn(),
  mockEmail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ markeerVerzonden: mockMarkeer, getOpdrachtById: mockGetById }),
}));
vi.mock("@/lib/mail", () => ({ verstuurMonteurMail: mockMail }));
vi.mock("@/lib/supabase-admin", () => ({ getGebruikerEmail: mockEmail }));
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
    mockMarkeer.mockReset();
    mockGetById.mockReset();
    mockMail.mockReset();
    mockEmail.mockReset();
    mockMarkeer.mockResolvedValue(undefined);
    mockMail.mockResolvedValue(undefined);
    mockEmail.mockResolvedValue("piet@monteur.nl");
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        toegewezen_aan: "piet-uid",
        monteur_naam: "Piet",
        startdatum: "2026-06-10",
        starttijd: null,
      }),
    );
    process.env.RAPPORT_EMAIL = "rein@example.com";
  });

  it("mailt gebundeld naar het monteur-adres en markeert elke opdracht", async () => {
    const res = await POST(req({ ids: ["a", "b"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockMail).toHaveBeenCalledTimes(1); // beide bij dezelfde monteur = 1 mail
    expect(mockMail.mock.calls[0][0].naar).toBe("piet@monteur.nl");
    expect(mockMail.mock.calls[0][0].opdrachten).toHaveLength(2);
    expect(mockMarkeer).toHaveBeenCalledTimes(2);
    expect(body.aantal).toBe(2);
  });

  it("stuurt aparte mails voor verschillende monteurs", async () => {
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({
        id,
        toegewezen_aan: id === "a" ? "piet-uid" : "dani-uid",
        monteur_naam: id === "a" ? "Piet" : "Dani",
        startdatum: "2026-06-10",
        starttijd: null,
      }),
    );
    await POST(req({ ids: ["a", "b"] }));
    expect(mockMail).toHaveBeenCalledTimes(2);
  });

  it("lege lijst volgt 400", async () => {
    const res = await POST(req({ ids: [] }));
    expect(res.status).toBe(400);
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("zonder monteur-adres en zonder RAPPORT_EMAIL: geen mail, wel status", async () => {
    mockEmail.mockResolvedValue(null);
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req({ ids: ["a"] }));
    expect(res.status).toBe(200);
    expect(mockMail).not.toHaveBeenCalled();
    expect(mockMarkeer).toHaveBeenCalledTimes(1);
  });
});
