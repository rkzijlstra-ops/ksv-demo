import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockGetById, mockMarkeer, mockSpoedMail } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockMarkeer: vi.fn(),
  mockSpoedMail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ getMeldingById: mockGetById, markeerSpoedVerzonden: mockMarkeer }),
}));
vi.mock("@/lib/mail", () => ({ verstuurSpoedMelding: mockSpoedMail }));

import { POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () =>
  new Request("http://localhost/api/meldingen/m-1/spoed-versturen", { method: "POST" });

const ORIG = process.env;

beforeEach(() => {
  mockGetById.mockReset();
  mockMarkeer.mockReset();
  mockSpoedMail.mockReset();
  // m-1 = de melding; opdr-1 = de opdracht eromheen
  mockGetById.mockImplementation(async (id: string) => {
    if (id === "m-1") return { id: "m-1", opdracht_id: "opdr-1", ruwe_tekst: "lekkage", foto_urls: [] };
    if (id === "opdr-1") return { id: "opdr-1", klant_naam: "van Dijk", referentienummer: "7407" };
    return null;
  });
  mockSpoedMail.mockResolvedValue(undefined);
  mockMarkeer.mockResolvedValue(undefined);
  process.env = { ...ORIG, RAPPORT_EMAIL: "rein@example.com" };
});
afterEach(() => {
  process.env = ORIG;
});

describe("POST /api/meldingen/[id]/spoed-versturen", () => {
  it("verstuurt spoed-mail en markeert verzonden, 200", async () => {
    const res = await POST(req(), params("m-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockSpoedMail).toHaveBeenCalledOnce();
    expect(mockSpoedMail.mock.calls[0][0].naar).toBe("rein@example.com");
    expect(mockSpoedMail.mock.calls[0][0].opdracht.klant_naam).toBe("van Dijk");
    expect(mockMarkeer).toHaveBeenCalledWith("m-1");
    expect(body.verstuurd).toBe(true);
  });

  it("404 als de melding niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req(), params("weg"));
    expect(res.status).toBe(404);
    expect(mockSpoedMail).not.toHaveBeenCalled();
  });

  it("502 als de spoed-mail mislukt, niet gemarkeerd", async () => {
    mockSpoedMail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(req(), params("m-1"));
    expect(res.status).toBe(502);
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("500 als RAPPORT_EMAIL ontbreekt", async () => {
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req(), params("m-1"));
    expect(res.status).toBe(500);
    expect(mockSpoedMail).not.toHaveBeenCalled();
  });
});
