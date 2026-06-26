import { describe, it, expect, vi, beforeEach } from "vitest";

// Gewone async functies + tellers i.p.v. vi.fn (vermijdt vitest unhandled-rejection
// false-positive bij rejecting mocks, zie upload-foto/route.test.ts).
const m = vi.hoisted(() => ({
  getByIdResult: null as { versie: number } | null,
  updateCalls: 0,
  updateArg: undefined as unknown,
  updateBehavior: async (..._args: unknown[]): Promise<void> => {},
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: async () => m.getByIdResult,
    updateMelding: (_id: string, data: unknown) => {
      m.updateCalls++;
      m.updateArg = data;
      return m.updateBehavior();
    },
  }),
}));

import { PATCH } from "./route";

function patchReq(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/meldingen/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const geldig = {
  spoed: true,
  ruwe_tekst: "Toch erger",
  foto_urls: [],
  status: "verzonden",
};

beforeEach(() => {
  m.getByIdResult = { versie: 1 };
  m.updateCalls = 0;
  m.updateArg = undefined;
  m.updateBehavior = async () => {};
});

describe("PATCH /api/meldingen/[id]", () => {
  it("hoogt versie op (huidige + 1) en geeft 200", async () => {
    m.getByIdResult = { versie: 2 };
    const res = await PATCH(patchReq("row-1", geldig), params("row-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.versie).toBe(3);
    expect(m.updateCalls).toBe(1);
    expect((m.updateArg as { versie: number }).versie).toBe(3);
  });

  it("werkt video_url bij als die wordt meegestuurd", async () => {
    const res = await PATCH(patchReq("row-1", { ...geldig, video_url: "https://x/v.mp4" }), params("row-1"));
    expect(res.status).toBe(200);
    expect((m.updateArg as { video_url: string | null }).video_url).toBe("https://x/v.mp4");
  });

  it("zet video_url op null als die ontbreekt", async () => {
    const res = await PATCH(patchReq("row-1", geldig), params("row-1"));
    expect(res.status).toBe(200);
    expect((m.updateArg as { video_url: string | null }).video_url).toBeNull();
  });

  it("geeft 404 als melding niet bestaat", async () => {
    m.getByIdResult = null;
    const res = await PATCH(patchReq("weg", geldig), params("weg"));
    expect(res.status).toBe(404);
    expect(m.updateCalls).toBe(0);
  });

  it("geeft 400 bij ongeldige spoed (geen boolean)", async () => {
    const res = await PATCH(patchReq("row-1", { ...geldig, spoed: "x" }), params("row-1"));
    expect(res.status).toBe(400);
    expect(m.updateCalls).toBe(0);
  });

  it("geeft 503 als update faalt", async () => {
    m.updateBehavior = async () => {
      throw new Error("DB update mislukt: time-out");
    };
    const res = await PATCH(patchReq("row-1", geldig), params("row-1"));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toMatch(/time-out/);
  });
});
