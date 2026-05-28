import { describe, it, expect, vi, beforeEach } from "vitest";

// Gewone async functie (geen vi.fn) als mock-gedrag, plus een handmatige call-teller.
// Reden: vitest's vi.fn houdt rejected promises bij in mock.results, wat samen met
// beforeEach een 'unhandled rejection' false-positive geeft bij de 503-test, ook al
// vangt de route de error correct. Een gewone functie omzeilt die results-tracking.
const m = vi.hoisted(() => ({
  calls: 0,
  lastArgs: [] as unknown[],
  behavior: async (..._args: unknown[]): Promise<{ url: string }> => ({ url: "" }),
}));

vi.mock("@/lib/storage", () => ({
  storage: () => ({
    uploadFoto: (...args: unknown[]) => {
      m.calls++;
      m.lastArgs = args;
      return m.behavior(...args);
    },
  }),
}));

import { POST } from "./route";

function req(file: File): Request {
  const fd = new FormData();
  fd.append("foto", file);
  return new Request("http://localhost/api/upload-foto", { method: "POST", body: fd });
}

beforeEach(() => {
  m.calls = 0;
  m.lastArgs = [];
  m.behavior = async () => ({ url: "" });
});

describe("POST /api/upload-foto", () => {
  it("uploadt foto en geeft 200 + url", async () => {
    m.behavior = async () => ({ url: "https://x/foto.jpg" });
    const file = new File([new Uint8Array([1, 2, 3])], "foto.jpg", { type: "image/jpeg" });

    const res = await POST(req(file));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://x/foto.jpg");
    expect(m.calls).toBe(1);
  });

  it("geeft 400 als 'foto' ontbreekt", async () => {
    const fd = new FormData();
    const r = new Request("http://localhost/api/upload-foto", { method: "POST", body: fd });
    const res = await POST(r);
    expect(res.status).toBe(400);
    expect(m.calls).toBe(0);
  });

  it("geeft 413 als foto groter dan 8 MB", async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1);
    const file = new File([big], "groot.jpg", { type: "image/jpeg" });
    const res = await POST(req(file));
    expect(res.status).toBe(413);
    expect(m.calls).toBe(0);
  });

  it("geeft 503 als storage faalt", async () => {
    m.behavior = async () => {
      throw new Error("Foto-upload mislukt: bucket not found");
    };
    const file = new File([new Uint8Array([1])], "foto.jpg", { type: "image/jpeg" });

    const res = await POST(req(file));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/bucket not found/);
  });
});
