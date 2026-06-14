import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGet,
  mockAttGet,
  mockGetProfielByToken,
  mockCreateOpdracht,
  mockAddDocument,
  mockUpload,
  mockParse,
  mockStandaard,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockAttGet: vi.fn(),
  mockGetProfielByToken: vi.fn(),
  mockCreateOpdracht: vi.fn(),
  mockAddDocument: vi.fn(),
  mockUpload: vi.fn(),
  mockParse: vi.fn(),
  mockStandaard: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { receiving: { get: mockGet, attachments: { get: mockAttGet } } };
    constructor(_key: string) {}
  },
}));
vi.mock("@/lib/db", () => ({
  dbAdmin: () => ({
    getProfielByInboundToken: mockGetProfielByToken,
    createOpdracht: mockCreateOpdracht,
    addDocument: mockAddDocument,
    getStandaardOpdrachtgever: mockStandaard,
  }),
}));
vi.mock("@/lib/storage", () => ({ storage: () => ({ uploadOpdrachtDocument: mockUpload }) }));
vi.mock("@/lib/claude-client", () => ({ parseOrderWithClaude: mockParse }));

import { POST } from "./route";

const TOKEN = "abc123";

function parsed(ref: string | null) {
  return {
    klant_naam: "Fam. De Bruijn",
    klant_adres: "Dorpsstraat 14",
    referentienummer: ref,
    adviseur: null,
    klant_telefoon: null,
    klant_email: null,
    documenttype: "orderbevestiging" as const,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    meldingen: [],
  };
}

function webhook(attachments: Array<{ id: string; filename: string; content_type: string }>) {
  mockGet.mockResolvedValue({
    error: null,
    data: { subject: "Klacht keuken", text: "lade onder de oven is kapot", attachments },
  });
  const event = { type: "email.received", data: { email_id: "em1", to: [`klus-${TOKEN}@kluslus.nl`] } };
  return new Request("http://localhost/api/inbound", { method: "POST", body: JSON.stringify(event) });
}

const pdf = (id: string) => ({ id, filename: `${id}.pdf`, content_type: "application/pdf" });

describe("POST /api/inbound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", ""); // geen secret -> handtekening overslaan
    vi.stubEnv("INBOUND_DOMAIN", "kluslus.nl");
    mockCreateOpdracht.mockResolvedValue({ id: "opdr-1" });
    mockAddDocument.mockResolvedValue({ id: "doc-1" });
    mockUpload.mockResolvedValue({ pad: "p.pdf", publieke_url: "https://x/p.pdf" });
    mockAttGet.mockResolvedValue({ data: { download_url: "https://x/att" } });
    mockStandaard.mockResolvedValue({ id: "zaak-ksv" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as unknown as typeof fetch;
  });

  it("monteur-adres: 2 PDF's zelfde ref -> één voorstel (gegroepeerd) + 2 documenten, te_verwerken, eigen werkpool", async () => {
    mockGetProfielByToken.mockResolvedValue({ id: "m1", rol: "monteur" });
    mockParse.mockResolvedValue(parsed("R1"));

    const res = await POST(webhook([pdf("a1"), pdf("a2")]));
    expect(res.status).toBe(200);

    expect(mockCreateOpdracht).toHaveBeenCalledOnce(); // gegroepeerd op ref
    const kop = mockCreateOpdracht.mock.calls[0][0];
    expect(kop.te_verwerken).toBe(true);
    expect(kop.toegewezen_aan).toBe("m1");
    expect(kop.opdrachtgever_id).toBeNull();
    expect(kop.werkomschrijving).toBe("lade onder de oven is kapot"); // mailtekst in het werk-veld
    expect(mockAddDocument).toHaveBeenCalledTimes(2);
  });

  it("kantoor-adres (opdrachtgever): direct als klus voor de zaak, niet te_verwerken, niet toegewezen", async () => {
    mockGetProfielByToken.mockResolvedValue({ id: "ed1", rol: "opdrachtgever", opdrachtgever_id: "zaak1" });
    mockParse.mockResolvedValue(parsed("R1"));

    await POST(webhook([pdf("a1")]));

    const kop = mockCreateOpdracht.mock.calls[0][0];
    expect(kop.te_verwerken).toBe(false); // verschijnt direct op het dashboard
    expect(kop.opdrachtgever_id).toBe("zaak1");
    expect(kop.toegewezen_aan).toBeNull();
  });

  it("beheerder-adres zonder eigen zaak: valt terug op de standaard-zaak (komt op het dashboard)", async () => {
    mockGetProfielByToken.mockResolvedValue({ id: "rein1", rol: "beheerder" });
    mockParse.mockResolvedValue(parsed("R1"));

    await POST(webhook([pdf("a1")]));

    const kop = mockCreateOpdracht.mock.calls[0][0];
    expect(kop.opdrachtgever_id).toBe("zaak-ksv");
    expect(kop.te_verwerken).toBe(false);
    expect(kop.toegewezen_aan).toBeNull();
  });

  it("2 PDF's met verschillende refs -> twee aparte voorstellen", async () => {
    mockGetProfielByToken.mockResolvedValue({ id: "m1", rol: "monteur" });
    mockParse.mockResolvedValueOnce(parsed("R1")).mockResolvedValueOnce(parsed("R2"));

    await POST(webhook([pdf("a1"), pdf("a2")]));

    expect(mockCreateOpdracht).toHaveBeenCalledTimes(2);
  });

  it("geen PDF: één voorstel met onderwerp als naam en mailtekst in het werk-veld", async () => {
    mockGetProfielByToken.mockResolvedValue({ id: "m1", rol: "monteur" });

    await POST(webhook([]));

    expect(mockParse).not.toHaveBeenCalled();
    const kop = mockCreateOpdracht.mock.calls[0][0];
    expect(kop.klant_naam).toBe("Klacht keuken");
    expect(kop.werkomschrijving).toBe("lade onder de oven is kapot");
  });

  it("onbekend token: doet niets (200)", async () => {
    mockGetProfielByToken.mockResolvedValue(null);
    const res = await POST(webhook([pdf("a1")]));
    expect(res.status).toBe(200);
    expect(mockCreateOpdracht).not.toHaveBeenCalled();
  });
});
