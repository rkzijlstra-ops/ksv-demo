import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockGetMelding, mockGetProfiel, mockCreate, mockVerplaats, mockVerwijder } = vi.hoisted(
  () => ({
    mockAuth: vi.fn(),
    mockGetMelding: vi.fn(),
    mockGetProfiel: vi.fn(),
    mockCreate: vi.fn(),
    mockVerplaats: vi.fn(),
    mockVerwijder: vi.fn(),
  }),
);

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuth }));
vi.mock("@/lib/db", () => ({
  db: async () => ({ getMeldingById: mockGetMelding, getProfiel: mockGetProfiel }),
  dbAdmin: () => ({
    createOpdracht: mockCreate,
    verplaatsDocument: mockVerplaats,
    verwijderOpdracht: mockVerwijder,
  }),
}));

import { POST } from "./route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/x", { method: "POST" });

function meldingMet(voorstel: unknown) {
  return {
    id: "m1",
    toegewezen_aan: "u1",
    opdrachtgever_id: null,
    user_id: "u1",
    te_verwerken: true,
    splits_voorstel: voorstel,
  };
}

const voorstel2 = [
  { velden: { klant_naam: "Jansen", documenttype: "onbekend" }, document_ids: ["d1"] },
  { velden: { klant_naam: "De Vries", documenttype: "onbekend" }, document_ids: ["d2"] },
];

describe("POST /api/inbound/[id]/splitsen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValueOnce({ id: "n1" }).mockResolvedValueOnce({ id: "n2" });
  });

  it("splitst in losse klussen, verplaatst documenten, verwijdert origineel", async () => {
    mockAuth.mockResolvedValue("u1");
    mockGetMelding.mockResolvedValue(meldingMet(voorstel2));
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });

    const res = await POST(req(), ctx("m1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ aantal: 2 });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate.mock.calls[0][0].klant_naam).toBe("Jansen");
    expect(mockCreate.mock.calls[0][0].te_verwerken).toBe(true); // erft status van het voorstel
    expect(mockCreate.mock.calls[0][0].controleer_splitsing).toBe(false);
    expect(mockVerplaats).toHaveBeenCalledWith("d1", "n1");
    expect(mockVerplaats).toHaveBeenCalledWith("d2", "n2");
    expect(mockVerwijder).toHaveBeenCalledWith("m1"); // origineel weg
  });

  it("geeft 401 zonder login", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req(), ctx("m1"));
    expect(res.status).toBe(401);
  });

  it("geeft 403 als een andere monteur niet de eigenaar is", async () => {
    mockAuth.mockResolvedValue("ander");
    mockGetMelding.mockResolvedValue(meldingMet(voorstel2));
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await POST(req(), ctx("m1"));
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("geeft 400 als er geen splitsing bewaard is", async () => {
    mockAuth.mockResolvedValue("u1");
    mockGetMelding.mockResolvedValue(meldingMet(null));
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await POST(req(), ctx("m1"));
    expect(res.status).toBe(400);
  });
});
