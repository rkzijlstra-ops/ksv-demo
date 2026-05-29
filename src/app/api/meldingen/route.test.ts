import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  calls: 0,
  lastArg: undefined as unknown,
  behavior: async (..._args: unknown[]): Promise<{ id: string }> => ({ id: "m-1" }),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    createMonteurMelding: (arg: unknown) => {
      m.calls++;
      m.lastArg = arg;
      return m.behavior(arg);
    },
  }),
}));

import { POST } from "./route";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/meldingen", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const geldig = {
  opdracht_id: "9e4d149e-b523-4853-b014-61c4df593217",
  spoed: false,
  ruwe_tekst: "Front bovenkast beschadigd",
  foto_urls: ["https://x/f1.jpg"],
};

beforeEach(() => {
  m.calls = 0;
  m.lastArg = undefined;
  m.behavior = async () => ({ id: "m-1" });
});

describe("POST /api/meldingen", () => {
  it("maakt monteur-melding en geeft 200 + id", async () => {
    const res = await POST(jsonReq(geldig));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toBe("m-1");
    expect(m.calls).toBe(1);
    expect((m.lastArg as { spoed: boolean }).spoed).toBe(false);
  });

  it("geeft 400 als spoed geen boolean is", async () => {
    const res = await POST(jsonReq({ ...geldig, spoed: "ja" }));
    expect(res.status).toBe(400);
    expect(m.calls).toBe(0);
  });

  it("geeft 400 als spoed ontbreekt", async () => {
    const { spoed: _s, ...zonderSpoed } = geldig;
    const res = await POST(jsonReq(zonderSpoed));
    expect(res.status).toBe(400);
  });

  it("bewaart spoed=true", async () => {
    const res = await POST(jsonReq({ ...geldig, spoed: true }));
    expect(res.status).toBe(200);
    expect((m.lastArg as { spoed: boolean }).spoed).toBe(true);
  });

  it("geeft 503 als DB faalt", async () => {
    m.behavior = async () => {
      throw new Error("DB insert mislukt: connection refused");
    };
    const res = await POST(jsonReq(geldig));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toMatch(/connection refused/);
  });
});
