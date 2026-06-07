import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetProfiel,
  mockTelBeheerders,
  mockTelKlussen,
  mockGetZaak,
  mockUpdateRol,
  mockUpdateNaam,
  mockGetEmail,
  mockDeleteUser,
  mockAfmelding,
  mockAuthId,
} = vi.hoisted(() => ({
  mockGetProfiel: vi.fn(),
  mockTelBeheerders: vi.fn(),
  mockTelKlussen: vi.fn(),
  mockGetZaak: vi.fn(),
  mockUpdateRol: vi.fn(),
  mockUpdateNaam: vi.fn(),
  mockGetEmail: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockAfmelding: vi.fn(),
  mockAuthId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    getProfiel: mockGetProfiel,
    telBeheerders: mockTelBeheerders,
    telToegewezenOpdrachten: mockTelKlussen,
    getStandaardOpdrachtgever: mockGetZaak,
    updateProfielRol: mockUpdateRol,
    updateProfielNaam: mockUpdateNaam,
  }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({ auth: { admin: { deleteUser: mockDeleteUser } } }),
  getGebruikerEmail: mockGetEmail,
}));
vi.mock("@/lib/mail", () => ({
  verstuurAfmelding: mockAfmelding,
  verstuurUitnodiging: vi.fn(),
}));

import { DELETE, PATCH } from "./route";

const BEHEERDER = "beheerder-uuid";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchReq(rol: unknown) {
  return new Request("http://localhost/api/gebruikers/x", {
    method: "PATCH",
    body: JSON.stringify({ rol }),
    headers: { "content-type": "application/json" },
  });
}

/** Laat de db het opgegeven doel-profiel teruggeven naast de beheerder-aanvrager. */
function zetDoel(doel: { id: string; rol: string; naam: string } | null) {
  mockGetProfiel.mockImplementation(async (uid: string) => {
    if (uid === BEHEERDER) return { id: BEHEERDER, rol: "beheerder", naam: "Rein" };
    if (doel && uid === doel.id) return doel;
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue(BEHEERDER);
  zetDoel(null);
  mockTelBeheerders.mockResolvedValue(2);
  mockTelKlussen.mockResolvedValue(0);
  mockGetZaak.mockResolvedValue({ id: "z1", naam: "Keukenstudio Voorschoten" });
  mockGetEmail.mockResolvedValue("piet@example.com");
  mockDeleteUser.mockResolvedValue({ error: null });
  mockAfmelding.mockResolvedValue(undefined);
  mockUpdateRol.mockResolvedValue(undefined);
  mockUpdateNaam.mockResolvedValue(undefined);
});

function patchNaamReq(naam: unknown) {
  return new Request("http://localhost/api/gebruikers/x", {
    method: "PATCH",
    body: JSON.stringify({ naam }),
    headers: { "content-type": "application/json" },
  });
}

describe("DELETE /api/gebruikers/[id]", () => {
  it("403 als de aanvrager geen beheerder is", async () => {
    mockAuthId.mockResolvedValue("monteur-uuid");
    mockGetProfiel.mockResolvedValue({ id: "monteur-uuid", rol: "monteur", naam: "Piet" });
    const res = await DELETE(new Request("http://x"), ctx("iemand"));
    expect(res.status).toBe(403);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("400 als je jezelf wilt verwijderen", async () => {
    const res = await DELETE(new Request("http://x"), ctx(BEHEERDER));
    expect(res.status).toBe(400);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("404 als de gebruiker niet bestaat", async () => {
    const res = await DELETE(new Request("http://x"), ctx("onbekend"));
    expect(res.status).toBe(404);
  });

  it("409 als het de laatste beheerder is", async () => {
    zetDoel({ id: "b2", rol: "beheerder", naam: "Tweede" });
    mockTelBeheerders.mockResolvedValue(1);
    const res = await DELETE(new Request("http://x"), ctx("b2"));
    expect(res.status).toBe(409);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("409 als de monteur nog openstaande klussen heeft", async () => {
    zetDoel({ id: "m1", rol: "monteur", naam: "Piet" });
    mockTelKlussen.mockResolvedValue(2);
    const res = await DELETE(new Request("http://x"), ctx("m1"));
    expect(res.status).toBe(409);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("verwijdert het account en stuurt een afmeld-mail", async () => {
    zetDoel({ id: "m1", rol: "monteur", naam: "Piet" });
    const res = await DELETE(new Request("http://x"), ctx("m1"));
    expect(res.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith("m1");
    expect(mockAfmelding).toHaveBeenCalledOnce();
    expect(mockAfmelding.mock.calls[0][0]).toMatchObject({
      naar: "piet@example.com",
      naam: "Piet",
      organisatie: "Keukenstudio Voorschoten",
    });
  });
});

describe("PATCH /api/gebruikers/[id]", () => {
  it("400 bij een ongeldige rol", async () => {
    const res = await PATCH(patchReq("beheerder"), ctx("m1"));
    expect(res.status).toBe(400);
  });

  it("409 als je een beheerder probeert te degraderen", async () => {
    zetDoel({ id: "b2", rol: "beheerder", naam: "Tweede" });
    const res = await PATCH(patchReq("monteur"), ctx("b2"));
    expect(res.status).toBe(409);
    expect(mockUpdateRol).not.toHaveBeenCalled();
  });

  it("wijzigt de rol van een monteur naar opdrachtgever", async () => {
    zetDoel({ id: "m1", rol: "monteur", naam: "Piet" });
    const res = await PATCH(patchReq("opdrachtgever"), ctx("m1"));
    expect(res.status).toBe(200);
    expect(mockUpdateRol).toHaveBeenCalledWith("m1", "opdrachtgever");
  });

  it("hernoemt een gebruiker als alleen een naam wordt meegestuurd", async () => {
    zetDoel({ id: "m1", rol: "monteur", naam: "Piet" });
    const res = await PATCH(patchNaamReq("  Piet de Vries  "), ctx("m1"));
    expect(res.status).toBe(200);
    expect(mockUpdateNaam).toHaveBeenCalledWith("m1", "Piet de Vries");
    expect(mockUpdateRol).not.toHaveBeenCalled();
  });

  it("400 bij een lege naam", async () => {
    zetDoel({ id: "m1", rol: "monteur", naam: "Piet" });
    const res = await PATCH(patchNaamReq("   "), ctx("m1"));
    expect(res.status).toBe(400);
    expect(mockUpdateNaam).not.toHaveBeenCalled();
  });

  it("404 als de te hernoemen gebruiker niet bestaat", async () => {
    const res = await PATCH(patchNaamReq("Nieuwe Naam"), ctx("onbekend"));
    expect(res.status).toBe(404);
    expect(mockUpdateNaam).not.toHaveBeenCalled();
  });
});
