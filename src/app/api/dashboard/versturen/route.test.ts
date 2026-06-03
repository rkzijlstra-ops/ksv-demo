import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerstuur, mockGetById, mockMail } = vi.hoisted(() => ({
  mockVerstuur: vi.fn(),
  mockGetById: vi.fn(),
  mockMail: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ verstuurNaarMonteurs: mockVerstuur, getOpdrachtById: mockGetById }),
}));
vi.mock("@/lib/mail", () => ({ verstuurMonteurMail: mockMail }));
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
    mockGetById.mockReset();
    mockMail.mockReset();
    mockVerstuur.mockResolvedValue(undefined);
    mockMail.mockResolvedValue(undefined);
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({ id, monteur_naam: "Rein", klant_naam: "Klant" }),
    );
    process.env.RAPPORT_EMAIL = "rein@example.com";
  });

  it("mailt gebundeld per monteur en zet de status", async () => {
    const res = await POST(req({ ids: ["a", "b"] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockMail).toHaveBeenCalledTimes(1); // beide bij dezelfde monteur = 1 mail
    expect(mockMail.mock.calls[0][0].opdrachten).toHaveLength(2);
    expect(mockVerstuur).toHaveBeenCalledWith(["a", "b"]);
    expect(body.aantal).toBe(2);
  });

  it("stuurt aparte mails voor verschillende monteurs", async () => {
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve({ id, monteur_naam: id === "a" ? "Rein" : "Dani", klant_naam: "K" }),
    );
    await POST(req({ ids: ["a", "b"] }));
    expect(mockMail).toHaveBeenCalledTimes(2);
  });

  it("lege lijst volgt 400", async () => {
    const res = await POST(req({ ids: [] }));
    expect(res.status).toBe(400);
    expect(mockVerstuur).not.toHaveBeenCalled();
  });

  it("500 als RAPPORT_EMAIL ontbreekt", async () => {
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req({ ids: ["a"] }));
    expect(res.status).toBe(500);
  });
});
