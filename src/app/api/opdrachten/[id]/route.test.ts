import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockVerwijder, mockGetProfiel, mockGetOpdrachtById, mockUpdateGegevens, mockAuthId, mockLog } =
  vi.hoisted(() => ({
    mockGetById: vi.fn(),
    mockVerwijder: vi.fn(),
    mockGetProfiel: vi.fn(),
    mockGetOpdrachtById: vi.fn(),
    mockUpdateGegevens: vi.fn(),
    mockAuthId: vi.fn(),
    mockLog: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    verwijderOpdracht: mockVerwijder,
    getProfiel: mockGetProfiel,
    getOpdrachtById: mockGetOpdrachtById,
    updateOpdrachtGegevens: mockUpdateGegevens,
    logGebeurtenis: mockLog,
  }),
}));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));

import { DELETE, PATCH } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/opdrachten/opdr-1", { method: "DELETE" });
function patchReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/opdrachten/opdr-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetById.mockResolvedValue({ id: "opdr-1", klant_naam: "van Dijk" });
  mockVerwijder.mockResolvedValue(undefined);
  mockAuthId.mockResolvedValue("beheerder-uid");
  mockGetProfiel.mockResolvedValue({ id: "beheerder-uid", rol: "beheerder" });
  mockGetOpdrachtById.mockResolvedValue({ id: "opdr-1", documenttype: "onbekend" });
  mockUpdateGegevens.mockResolvedValue(undefined);
  mockLog.mockResolvedValue(undefined);
});

describe("DELETE /api/opdrachten/[id]", () => {
  it("verwijdert een bestaande opdracht, 200, en logt de gebeurtenis", async () => {
    const res = await DELETE(req(), params("opdr-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("opdr-1");
    expect(body.verwijderd).toBe(true);
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ opdracht_id: "opdr-1", actie: "verwijderd" }),
    );
  });

  it("404 als de opdracht niet bestaat, verwijdert niets", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await DELETE(req(), params("weg"));
    expect(res.status).toBe(404);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("503 als verwijderen in de db faalt", async () => {
    mockVerwijder.mockRejectedValue(new Error("fk locked"));
    const res = await DELETE(req(), params("opdr-1"));
    expect(res.status).toBe(503);
  });

  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await DELETE(req(), params("opdr-1"));
    expect(res.status).toBe(401);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("monteur mag zijn EIGEN ingeschoten klus verwijderen", async () => {
    mockAuthId.mockResolvedValue("m1");
    mockGetProfiel.mockResolvedValue({ id: "m1", rol: "monteur" });
    mockGetById.mockResolvedValue({ id: "opdr-1", user_id: "m1" });
    const res = await DELETE(req(), params("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("opdr-1");
  });

  it("403 als een monteur een door KANTOOR ingeschoten klus probeert te verwijderen", async () => {
    mockAuthId.mockResolvedValue("m1");
    mockGetProfiel.mockResolvedValue({ id: "m1", rol: "monteur" });
    mockGetById.mockResolvedValue({ id: "opdr-1", user_id: "ed-uid" });
    const res = await DELETE(req(), params("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/opdrachten/[id]", () => {
  it("403 als een monteur de gegevens probeert te corrigeren", async () => {
    mockGetProfiel.mockResolvedValue({ id: "m1", rol: "monteur" });
    const res = await PATCH(patchReq({ klant_naam: "X" }), params("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockUpdateGegevens).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetOpdrachtById.mockResolvedValue(null);
    const res = await PATCH(patchReq({ klant_naam: "X" }), params("weg"));
    expect(res.status).toBe(404);
  });

  it("corrigeert de kop-velden (getrimd, leeg = null) en behoudt onbekend type", async () => {
    const res = await PATCH(
      patchReq({
        klant_naam: "  Fam. de Wit  ",
        referentienummer: "9001",
        klant_adres: "",
        documenttype: "werkbon_service",
      }),
      params("opdr-1"),
    );
    expect(res.status).toBe(200);
    expect(mockUpdateGegevens).toHaveBeenCalledWith("opdr-1", {
      klant_naam: "Fam. de Wit",
      klant_adres: null,
      klant_telefoon: null,
      referentienummer: "9001",
      keukenzaak: null,
      documenttype: "werkbon_service",
    });
  });
});
