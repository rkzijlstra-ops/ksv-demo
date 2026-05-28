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
  urgentie: "geel",
  ruwe_tekst: "Front bovenkast beschadigd",
  foto_urls: ["https://x/f1.jpg"],
  status: "concept",
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
    expect((m.lastArg as { urgentie: string }).urgentie).toBe("geel");
  });

  it("geeft 400 bij ongeldige urgentie", async () => {
    const res = await POST(jsonReq({ ...geldig, urgentie: "paars" }));
    expect(res.status).toBe(400);
    expect(m.calls).toBe(0);
  });

  it("geeft 400 als status ontbreekt", async () => {
    const { status: _s, ...zonderStatus } = geldig;
    const res = await POST(jsonReq(zonderStatus));
    expect(res.status).toBe(400);
  });

  it("accepteert status 'verzonden'", async () => {
    const res = await POST(jsonReq({ ...geldig, status: "verzonden" }));
    expect(res.status).toBe(200);
    expect((m.lastArg as { status: string }).status).toBe("verzonden");
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
