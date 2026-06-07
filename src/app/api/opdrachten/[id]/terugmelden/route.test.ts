import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGetById, mockGetProfiel, mockTerugmeld, mockLog, mockMail } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGetById: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockTerugmeld: vi.fn(),
  mockLog: vi.fn(),
  mockMail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    getProfiel: mockGetProfiel,
    markeerTeruggemeld: mockTerugmeld,
    logGebeurtenis: mockLog,
  }),
}));
vi.mock("@/lib/mail", () => ({ verstuurTerugmelding: mockMail }));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(body: unknown) {
  return new Request("http://localhost/api/opdrachten/opdr-1/terugmelden", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAPPORT_EMAIL = "kantoor@kluslus.test";
  mockAuthId.mockResolvedValue("m1");
  mockGetById.mockResolvedValue({
    id: "opdr-1", klant_naam: "Fam. Bakker", referentienummer: "7588", keukenzaak: "KSV",
    toegewezen_aan: "m1", monteur_naam: "Rein RK",
  });
  mockGetProfiel.mockResolvedValue({ id: "m1", rol: "monteur", naam: "Rein RK" });
  mockTerugmeld.mockResolvedValue(undefined);
  mockLog.mockResolvedValue(undefined);
  mockMail.mockResolvedValue(undefined);
});

describe("POST /api/opdrachten/[id]/terugmelden", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await POST(req({ reden: "klant_niet_thuis" }), ctx("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockTerugmeld).not.toHaveBeenCalled();
  });

  it("400 bij een ongeldige reden", async () => {
    const res = await POST(req({ reden: "zomaar" }), ctx("opdr-1"));
    expect(res.status).toBe(400);
    expect(mockTerugmeld).not.toHaveBeenCalled();
  });

  it("403 als de melder niet de toegewezen monteur is", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", toegewezen_aan: "andere-monteur" });
    const res = await POST(req({ reden: "klant_niet_thuis" }), ctx("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockTerugmeld).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req({ reden: "klant_niet_thuis" }), ctx("weg"));
    expect(res.status).toBe(404);
  });

  it("meldt terug, logt en mailt kantoor, 200", async () => {
    const res = await POST(req({ reden: "klant_niet_thuis", toelichting: "3x aangebeld" }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockTerugmeld).toHaveBeenCalledWith("opdr-1", { reden: "klant_niet_thuis", toelichting: "3x aangebeld" });
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ opdracht_id: "opdr-1", actie: "teruggemeld" }),
    );
    expect(mockMail).toHaveBeenCalledTimes(1);
    expect((await res.json()).gemaild).toBe(true);
  });

  it("meldt tóch terug (200) als de mail faalt, met mailFout", async () => {
    mockMail.mockRejectedValue(new Error("resend down"));
    const res = await POST(req({ reden: "werk_niet_afgerond" }), ctx("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockTerugmeld).toHaveBeenCalled();
    const body = await res.json();
    expect(body.gemaild).toBe(false);
    expect(body.mailFout).toContain("resend down");
  });
});
