import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockVerwijder } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockVerwijder: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ getMeldingById: mockGetById, verwijderOpdracht: mockVerwijder }),
}));

import { DELETE } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/opdrachten/opdr-1", { method: "DELETE" });

beforeEach(() => {
  mockGetById.mockReset();
  mockVerwijder.mockReset();
  mockGetById.mockResolvedValue({ id: "opdr-1", klant_naam: "van Dijk" });
  mockVerwijder.mockResolvedValue(undefined);
});

describe("DELETE /api/opdrachten/[id]", () => {
  it("verwijdert een bestaande opdracht, 200", async () => {
    const res = await DELETE(req(), params("opdr-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("opdr-1");
    expect(body.verwijderd).toBe(true);
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
});
