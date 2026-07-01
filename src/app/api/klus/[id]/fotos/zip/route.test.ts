import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// db() mocken zodat de route-logica (selectie, zip, statuscodes) los te testen is zonder echte DB.
const getMeldingById = vi.fn();
const getMeldingenVoorOpdracht = vi.fn();
const getOpleveringVoorOpdracht = vi.fn();
vi.mock("@/lib/db", () => ({
  db: async () => ({ getMeldingById, getMeldingenVoorOpdracht, getOpleveringVoorOpdracht }),
}));

import { GET } from "./route";

function req(id: string, qs = "") {
  return new Request(`http://localhost/api/klus/${id}/fotos/zip${qs}`);
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function melding(over: Record<string, unknown> = {}) {
  return { id: "m1", spoed: false, ruwe_tekst: "Iets", created_at: "2026-06-28T10:00:00Z", foto_urls: [], ...over };
}

beforeEach(() => {
  getMeldingById.mockReset();
  getMeldingenVoorOpdracht.mockReset();
  getOpleveringVoorOpdracht.mockReset();
  getMeldingById.mockResolvedValue({ id: "klus-1", referentienummer: "7407" });
  getMeldingenVoorOpdracht.mockResolvedValue([melding({ foto_urls: ["https://x/m1.jpg"] })]);
  getOpleveringVoorOpdracht.mockResolvedValue({ eindstaat_foto_urls: ["https://x/e1.jpg"] });
});
afterEach(() => vi.unstubAllGlobals());

function stubFetchOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer }),
  );
}

async function zipMagic(res: Response): Promise<boolean> {
  const b = new Uint8Array(await res.arrayBuffer());
  return b[0] === 0x50 && b[1] === 0x4b; // "PK"
}

describe("GET /api/klus/[id]/fotos/zip", () => {
  it("404 als de klus niet bestaat", async () => {
    getMeldingById.mockResolvedValue(null);
    const res = await GET(req("onbekend"), ctx("onbekend"));
    expect(res.status).toBe(404);
  });

  it("404 als er geen foto's bij de klus zijn", async () => {
    getMeldingenVoorOpdracht.mockResolvedValue([melding({ foto_urls: [] })]);
    getOpleveringVoorOpdracht.mockResolvedValue({ eindstaat_foto_urls: [] });
    const res = await GET(req("klus-1"), ctx("klus-1"));
    expect(res.status).toBe(404);
  });

  it("levert een zip met alle foto's zonder selectie", async () => {
    stubFetchOk();
    const res = await GET(req("klus-1"), ctx("klus-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain("fotos-7407.zip");
    expect(await zipMagic(res)).toBe(true);
  });

  it("respecteert een geldige selectie (sel=0)", async () => {
    stubFetchOk();
    const res = await GET(req("klus-1", "?sel=0"), ctx("klus-1"));
    expect(res.status).toBe(200);
    expect(await zipMagic(res)).toBe(true);
  });

  it("400 bij een selectie zonder geldige index", async () => {
    stubFetchOk();
    const res = await GET(req("klus-1", "?sel=99"), ctx("klus-1"));
    expect(res.status).toBe(400);
  });

  it("502 als geen enkele foto opgehaald kan worden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const res = await GET(req("klus-1"), ctx("klus-1"));
    expect(res.status).toBe(502);
  });
});
