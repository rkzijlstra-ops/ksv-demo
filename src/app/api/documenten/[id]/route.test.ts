import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerwijder } = vi.hoisted(() => ({ mockVerwijder: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: () => ({ verwijderDocument: mockVerwijder }) }));

import { DELETE } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/documenten/doc-1", { method: "DELETE" });

beforeEach(() => {
  mockVerwijder.mockReset();
  mockVerwijder.mockResolvedValue(undefined);
});

describe("DELETE /api/documenten/[id]", () => {
  it("verwijdert het document, 200", async () => {
    const res = await DELETE(req(), params("doc-1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockVerwijder).toHaveBeenCalledWith("doc-1");
    expect(body.verwijderd).toBe(true);
  });

  it("503 als verwijderen faalt", async () => {
    mockVerwijder.mockRejectedValue(new Error("db stuk"));
    const res = await DELETE(req(), params("doc-1"));
    expect(res.status).toBe(503);
  });
});
