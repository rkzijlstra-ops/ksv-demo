import { describe, it, expect, vi, beforeEach } from "vitest";

// Gewone async functie + call-teller i.p.v. vi.fn, om vitest's unhandled-rejection
// false-positive bij de 502-test te vermijden (zie upload-foto/route.test.ts).
const m = vi.hoisted(() => ({
  calls: 0,
  behavior: async (..._args: unknown[]): Promise<string> => "",
}));

vi.mock("@/lib/transcribe", () => ({
  transcriber: () => ({
    transcribe: (...args: unknown[]) => {
      m.calls++;
      return m.behavior(...args);
    },
  }),
}));

import { POST } from "./route";

function req(file: File): Request {
  const fd = new FormData();
  fd.append("audio", file);
  return new Request("http://localhost/api/transcribe", { method: "POST", body: fd });
}

beforeEach(() => {
  m.calls = 0;
  m.behavior = async () => "";
});

describe("POST /api/transcribe", () => {
  it("transcribeert audio en geeft 200 + tekst", async () => {
    m.behavior = async () => "Front bovenkast beschadigd";
    const file = new File([new Uint8Array([1, 2, 3])], "audio.webm", { type: "audio/webm" });

    const res = await POST(req(file));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tekst).toBe("Front bovenkast beschadigd");
    expect(m.calls).toBe(1);
  });

  it("geeft 400 als 'audio' ontbreekt", async () => {
    const fd = new FormData();
    const r = new Request("http://localhost/api/transcribe", { method: "POST", body: fd });
    const res = await POST(r);
    expect(res.status).toBe(400);
    expect(m.calls).toBe(0);
  });

  it("geeft 413 als audio groter dan 25 MB", async () => {
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    const file = new File([big], "groot.webm", { type: "audio/webm" });
    const res = await POST(req(file));
    expect(res.status).toBe(413);
    expect(m.calls).toBe(0);
  });

  it("geeft 502 als Whisper faalt", async () => {
    m.behavior = async () => {
      throw new Error("Whisper-fout (401): invalid api key");
    };
    const file = new File([new Uint8Array([1])], "audio.webm", { type: "audio/webm" });

    const res = await POST(req(file));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/Whisper-fout/);
  });
});
