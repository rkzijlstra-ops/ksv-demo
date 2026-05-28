import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTranscriber } from "./transcribe";

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTranscriber -> transcribe", () => {
  it("stuurt audio naar Whisper en geeft getrimde tekst terug", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ text: "  Front bovenkast beschadigd  " }),
    });

    const result = await createTranscriber({ apiKey: "sk-test" }).transcribe(
      Buffer.from("audio"),
      "audio/webm",
    );

    expect(result).toBe("Front bovenkast beschadigd");
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("audio/transcriptions");
    expect(opts.headers.Authorization).toBe("Bearer sk-test");
    expect(opts.method).toBe("POST");
  });

  it("gooit Whisper-fout bij niet-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });

    await expect(
      createTranscriber({ apiKey: "sk-bad" }).transcribe(Buffer.from("a"), "audio/webm"),
    ).rejects.toThrow(/Whisper-fout \(401\)/);
  });

  it("geeft lege string als 'text' ontbreekt", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await createTranscriber({ apiKey: "sk" }).transcribe(
      Buffer.from("a"),
      "audio/webm",
    );
    expect(result).toBe("");
  });
});
