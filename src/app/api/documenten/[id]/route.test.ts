import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthId, mockGetProfiel, mockGetDoc, mockVerwijder, mockStorageVerwijder } = vi.hoisted(() => ({
  mockAuthId: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockGetDoc: vi.fn(),
  mockVerwijder: vi.fn(),
  mockStorageVerwijder: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: mockAuthId }));
vi.mock("@/lib/db", () => ({
  db: () => ({ getProfiel: mockGetProfiel, getDocumentById: mockGetDoc, verwijderDocument: mockVerwijder }),
}));
vi.mock("@/lib/storage", () => ({ storage: () => ({ verwijderOpdrachtDocument: mockStorageVerwijder }) }));

import { DELETE } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/documenten/doc-1", { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthId.mockResolvedValue("kantoor-uid");
  mockGetProfiel.mockResolvedValue({ rol: "beheerder" });
  mockGetDoc.mockResolvedValue({ id: "doc-1", storage_pad: "uuid.pdf" });
  mockVerwijder.mockResolvedValue(undefined);
  mockStorageVerwijder.mockResolvedValue(undefined);
});

describe("DELETE /api/documenten/[id]", () => {
  it("401 als niet ingelogd", async () => {
    mockAuthId.mockResolvedValue(null);
    const res = await DELETE(req(), params("doc-1"));
    expect(res.status).toBe(401);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("403 voor een monteur", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await DELETE(req(), params("doc-1"));
    expect(res.status).toBe(403);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("404 als het document niet bestaat", async () => {
    mockGetDoc.mockResolvedValue(null);
    const res = await DELETE(req(), params("weg"));
    expect(res.status).toBe(404);
    expect(mockVerwijder).not.toHaveBeenCalled();
  });

  it("verwijdert de rij én het storage-bestand, 200", async () => {
    const res = await DELETE(req(), params("doc-1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("doc-1");
    expect(mockStorageVerwijder).toHaveBeenCalledWith("uuid.pdf");
    expect(body.verwijderd).toBe(true);
  });

  it("verwijdert tóch (200) als storage-opruiming faalt", async () => {
    mockStorageVerwijder.mockRejectedValue(new Error("storage stuk"));
    const res = await DELETE(req(), params("doc-1"));
    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("doc-1");
  });

  it("503 als het verwijderen van de rij faalt", async () => {
    mockVerwijder.mockRejectedValue(new Error("db stuk"));
    const res = await DELETE(req(), params("doc-1"));
    expect(res.status).toBe(503);
  });
});
