import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockGetById,
  mockGetMeldingen,
  mockMarkeer,
  mockUpload,
  mockPdf,
  mockMail,
  mockGetOpl,
  mockFinaliseer,
} = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetMeldingen: vi.fn(),
  mockMarkeer: vi.fn(),
  mockUpload: vi.fn(),
  mockPdf: vi.fn(),
  mockMail: vi.fn(),
  mockGetOpl: vi.fn(),
  mockFinaliseer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    getMeldingenVoorOpdracht: mockGetMeldingen,
    markeerOpgeleverd: mockMarkeer,
    getOpleveringVoorOpdracht: mockGetOpl,
    finaliseerOplevering: mockFinaliseer,
  }),
}));
vi.mock("@/lib/storage", () => ({ storage: () => ({ uploadOpdrachtDocument: mockUpload }) }));
vi.mock("@/lib/rapport", () => ({ genereerRapportPdf: mockPdf }));
vi.mock("@/lib/mail", () => ({ verstuurOpleverRapport: mockMail }));

import { POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/opdrachten/opdr-1/opleveren", { method: "POST" });

const ORIG = process.env;

beforeEach(() => {
  mockGetById.mockReset();
  mockGetMeldingen.mockReset();
  mockMarkeer.mockReset();
  mockUpload.mockReset();
  mockPdf.mockReset();
  mockMail.mockReset();
  mockGetOpl.mockReset();
  mockFinaliseer.mockReset();
  mockGetById.mockResolvedValue({ id: "opdr-1", klant_naam: "van Dijk", referentienummer: "7407" });
  mockGetMeldingen.mockResolvedValue([{ id: "m1", urgentie: "rood", ruwe_tekst: "x", foto_urls: [] }]);
  mockGetOpl.mockResolvedValue({
    id: "opl-1",
    opdracht_id: "opdr-1",
    uitkomst: "afgerond",
    eindstaat_foto_urls: [],
    video_url: "https://x/oplever-videos/v1.mp4",
    handtekening_url: null,
  });
  mockFinaliseer.mockResolvedValue(undefined);
  mockPdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  mockUpload.mockResolvedValue({ pad: "r.pdf", publieke_url: "https://x/opdracht-documenten/r.pdf" });
  mockMail.mockResolvedValue(undefined);
  mockMarkeer.mockResolvedValue(undefined);
  process.env = { ...ORIG, RAPPORT_EMAIL: "rein@example.com" };
});
afterEach(() => {
  process.env = ORIG;
});

describe("POST /api/opdrachten/[id]/opleveren", () => {
  it("happy path: genereert + mailt + markeert opgeleverd, 200 met rapport_url", async () => {
    const res = await POST(req(), params("opdr-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPdf).toHaveBeenCalledOnce();
    // oplevering wordt als 3e argument aan de rapport-generator meegegeven
    expect(mockPdf.mock.calls[0][2]).toMatchObject({ id: "opl-1", uitkomst: "afgerond" });
    expect(mockMail).toHaveBeenCalledOnce();
    expect(mockMail.mock.calls[0][0].naar).toBe("rein@example.com");
    expect(mockMail.mock.calls[0][0].videoUrl).toBe("https://x/oplever-videos/v1.mp4");
    expect(mockFinaliseer).toHaveBeenCalledWith("opdr-1", "https://x/opdracht-documenten/r.pdf");
    expect(mockMarkeer).toHaveBeenCalledWith("opdr-1", "https://x/opdracht-documenten/r.pdf");
    expect(body.opgeleverd).toBe(true);
    expect(body.rapport_url).toContain("opdracht-documenten");
  });

  it("409 als er nog geen oplevering-concept is vastgelegd", async () => {
    mockGetOpl.mockResolvedValue(null);
    const res = await POST(req(), params("opdr-1"));
    expect(res.status).toBe(409);
    expect(mockPdf).not.toHaveBeenCalled();
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("mailt naar het bij de oplevering ingestelde adres als dat er is", async () => {
    mockGetOpl.mockResolvedValue({
      id: "opl-1",
      uitkomst: "afgerond",
      eindstaat_foto_urls: [],
      video_url: null,
      handtekening_url: null,
      rapport_email: "zaak@keukenzaak.nl",
    });
    const res = await POST(req(), params("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockMail.mock.calls[0][0].naar).toBe("zaak@keukenzaak.nl");
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req(), params("weg"));
    expect(res.status).toBe(404);
    expect(mockPdf).not.toHaveBeenCalled();
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("mail mislukt: 502 en opdracht NIET op opgeleverd gezet", async () => {
    mockMail.mockRejectedValue(new Error("domain not verified"));
    const res = await POST(req(), params("opdr-1"));
    expect(res.status).toBe(502);
    expect(mockMarkeer).not.toHaveBeenCalled();
  });

  it("500 als RAPPORT_EMAIL ontbreekt, niets gemarkeerd of gemaild", async () => {
    delete process.env.RAPPORT_EMAIL;
    const res = await POST(req(), params("opdr-1"));
    expect(res.status).toBe(500);
    expect(mockMail).not.toHaveBeenCalled();
    expect(mockMarkeer).not.toHaveBeenCalled();
  });
});
