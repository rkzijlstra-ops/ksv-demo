import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockGetById,
  mockGetMeldingen,
  mockGetProfiel,
  mockUpload,
  mockPdf,
  mockMail,
  mockGetOpl,
  mockRegKlant,
  mockRegZaak,
  mockLog,
} = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockGetMeldingen: vi.fn(),
  mockGetProfiel: vi.fn(),
  mockUpload: vi.fn(),
  mockPdf: vi.fn(),
  mockMail: vi.fn(),
  mockGetOpl: vi.fn(),
  mockRegKlant: vi.fn(),
  mockRegZaak: vi.fn(),
  mockLog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    getMeldingById: mockGetById,
    getMeldingenVoorOpdracht: mockGetMeldingen,
    getProfiel: mockGetProfiel,
    getOpleveringVoorOpdracht: mockGetOpl,
    registreerKlantRapport: mockRegKlant,
    registreerZaakRapport: mockRegZaak,
    logRapportVerzending: mockLog,
  }),
}));
vi.mock("@/lib/storage", () => ({ storage: () => ({ uploadOpdrachtDocument: mockUpload }) }));
vi.mock("@/lib/rapport", () => ({ genereerRapportPdf: mockPdf }));
vi.mock("@/lib/mail", () => ({ verstuurOpleverRapport: mockMail }));

import { POST } from "./route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (doelgroep?: string) =>
  new Request("http://localhost/api/opdrachten/opdr-1/rapport", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doelgroep ? { doelgroep } : {}),
  });

const ORIG = process.env;

function opl(over: Record<string, unknown> = {}) {
  return {
    id: "opl-1",
    opdracht_id: "opdr-1",
    uitkomst: "afgerond",
    eindstaat_foto_urls: [],
    video_url: "https://x/oplever-videos/v1.mp4",
    handtekening_url: null,
    interne_opmerking: "Klant was lastig",
    rapport_email: "zaak@keukenzaak.nl",
    klant_rapport_email: "klant@voorbeeld.nl",
    klant_rapport_verzonden_at: null,
    ...over,
  };
}

beforeEach(() => {
  for (const m of [mockGetById, mockGetMeldingen, mockGetProfiel, mockUpload, mockPdf, mockMail, mockGetOpl, mockRegKlant, mockRegZaak, mockLog]) m.mockReset();
  mockGetById.mockResolvedValue({ id: "opdr-1", klant_naam: "van Dijk", referentienummer: "7407", toegewezen_aan: null });
  mockGetMeldingen.mockResolvedValue([]);
  mockGetProfiel.mockResolvedValue(null);
  mockGetOpl.mockResolvedValue(opl());
  mockPdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  mockUpload.mockResolvedValue({ pad: "r.pdf", publieke_url: "https://x/opdracht-documenten/r.pdf" });
  mockMail.mockResolvedValue(undefined);
  mockRegKlant.mockResolvedValue(undefined);
  mockRegZaak.mockResolvedValue(undefined);
  mockLog.mockResolvedValue(undefined);
  process.env = { ...ORIG, RAPPORT_EMAIL: "rein@example.com" };
});
afterEach(() => {
  process.env = ORIG;
});

describe("POST /api/opdrachten/[id]/rapport", () => {
  it("zaak: volledige versie, mailt naar zaak, zet opgeleverd", async () => {
    const res = await POST(req("zaak"), params("opdr-1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockPdf.mock.calls[0][4]).toBe("zaak"); // doelgroep = 5e arg
    expect(mockMail.mock.calls[0][0].naar).toBe("zaak@keukenzaak.nl");
    expect(mockMail.mock.calls[0][0].doelgroep).toBe("zaak");
    expect(mockRegZaak).toHaveBeenCalledWith("opdr-1", "https://x/opdracht-documenten/r.pdf");
    expect(mockRegKlant).not.toHaveBeenCalled();
    expect(body.opgeleverd).toBe(true);
    // Verzendgeschiedenis: de zaak-verzending is gelogd met adres en PDF.
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ doelgroep: "zaak", naar: "zaak@keukenzaak.nl", rapport_url: "https://x/opdracht-documenten/r.pdf" }),
    );
  });

  it("default zonder doelgroep = zaak", async () => {
    const res = await POST(req(), params("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockPdf.mock.calls[0][4]).toBe("zaak");
    expect(mockRegZaak).toHaveBeenCalled();
  });

  it("klant: schone versie, mailt naar klant, raakt de status NIET", async () => {
    const res = await POST(req("klant"), params("opdr-1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockPdf.mock.calls[0][4]).toBe("klant");
    expect(mockMail.mock.calls[0][0].naar).toBe("klant@voorbeeld.nl");
    expect(mockMail.mock.calls[0][0].doelgroep).toBe("klant");
    expect(mockRegKlant).toHaveBeenCalledWith("opdr-1", "https://x/opdracht-documenten/r.pdf", "klant@voorbeeld.nl");
    expect(mockRegZaak).not.toHaveBeenCalled();
    expect(body.opgeleverd).toBe(false);
    // Verzendgeschiedenis: de klant-verzending is gelogd.
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ doelgroep: "klant", naar: "klant@voorbeeld.nl" }),
    );
  });

  it("zaak vermeldt dat de klant zijn versie ook kreeg (klantOok)", async () => {
    mockGetOpl.mockResolvedValue(
      opl({ klant_rapport_verzonden_at: "2026-06-11T12:00:00Z", klant_rapport_email: "klant@voorbeeld.nl" }),
    );
    await POST(req("zaak"), params("opdr-1"));
    expect(mockMail.mock.calls[0][0].klantOok).toMatchObject({ adres: "klant@voorbeeld.nl" });
  });

  it("klant zonder klant-mailadres: 400, niets gemaild of geregistreerd", async () => {
    mockGetOpl.mockResolvedValue(opl({ klant_rapport_email: null }));
    const res = await POST(req("klant"), params("opdr-1"));
    expect(res.status).toBe(400);
    expect(mockMail).not.toHaveBeenCalled();
    expect(mockRegKlant).not.toHaveBeenCalled();
  });

  it("409 als er nog geen oplevering is", async () => {
    mockGetOpl.mockResolvedValue(null);
    const res = await POST(req("zaak"), params("opdr-1"));
    expect(res.status).toBe(409);
    expect(mockPdf).not.toHaveBeenCalled();
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);
    const res = await POST(req("zaak"), params("weg"));
    expect(res.status).toBe(404);
  });

  it("mail mislukt: 502 en niets geregistreerd", async () => {
    mockMail.mockRejectedValue(new Error("domain not verified"));
    const res = await POST(req("zaak"), params("opdr-1"));
    expect(res.status).toBe(502);
    expect(mockRegZaak).not.toHaveBeenCalled();
  });

  it("zaak zonder enig adres (geen rapport_email, geen RAPPORT_EMAIL): 500", async () => {
    delete process.env.RAPPORT_EMAIL;
    mockGetOpl.mockResolvedValue(opl({ rapport_email: null }));
    const res = await POST(req("zaak"), params("opdr-1"));
    expect(res.status).toBe(500);
    expect(mockMail).not.toHaveBeenCalled();
  });
});

describe("POST rapport: adres-override (Opnieuw versturen met correctie)", () => {
  const reqMet = (body: Record<string, unknown>) =>
    new Request("http://localhost/api/opdrachten/opdr-1/rapport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("gebruikt het gecorrigeerde adres als geldig `naar` is meegegeven", async () => {
    const res = await POST(reqMet({ doelgroep: "zaak", naar: "service@keukenzaak.nl" }), params("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockMail.mock.calls[0][0].naar).toBe("service@keukenzaak.nl");
    expect(mockLog.mock.calls[0][0].naar).toBe("service@keukenzaak.nl");
  });

  it("negeert een ongeldig override-adres en valt terug op het opgeslagen adres", async () => {
    const res = await POST(reqMet({ doelgroep: "zaak", naar: "geen-adres" }), params("opdr-1"));
    expect(res.status).toBe(200);
    expect(mockMail.mock.calls[0][0].naar).toBe("zaak@keukenzaak.nl");
  });
});
