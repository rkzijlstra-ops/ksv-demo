import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "@/lib/parser-schema";

const { mockParse, mockCreateOpdracht, mockAddDocument, mockUpload, mockGetProfiel, mockGetZaak } =
  vi.hoisted(() => ({
    mockParse: vi.fn(),
    mockCreateOpdracht: vi.fn(),
    mockAddDocument: vi.fn(),
    mockUpload: vi.fn(),
    mockGetProfiel: vi.fn(),
    mockGetZaak: vi.fn(),
  }));

vi.mock("@/lib/claude-client", () => ({ parsePdfWithClaude: mockParse }));
vi.mock("@/lib/db", () => ({
  db: () => ({
    createOpdracht: mockCreateOpdracht,
    addDocument: mockAddDocument,
    getProfiel: mockGetProfiel,
    getStandaardOpdrachtgever: mockGetZaak,
  }),
}));
vi.mock("@/lib/storage", () => ({ storage: () => ({ uploadOpdrachtDocument: mockUpload }) }));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function parsed(ref: string | null, naam = "Klant"): ParsedPdf {
  return {
    klant_naam: naam,
    klant_adres: "Straat 1",
    referentienummer: ref,
    adviseur: null,
    klant_telefoon: null,
    documenttype: "werkbon_service",
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    meldingen: [],
  };
}

function pdf(name: string): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: "application/pdf" });
}

function multipart(files: File[]): Request {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  return new Request("http://localhost/api/dashboard/inschieten", { method: "POST", body: fd });
}

describe("POST /api/dashboard/inschieten", () => {
  let opdrachtTeller = 0;
  beforeEach(() => {
    mockParse.mockReset();
    mockCreateOpdracht.mockReset();
    mockAddDocument.mockReset();
    mockUpload.mockReset();
    opdrachtTeller = 0;
    mockCreateOpdracht.mockImplementation(() => Promise.resolve({ id: `opdr-${++opdrachtTeller}` }));
    mockAddDocument.mockResolvedValue({ id: "doc-x" });
    mockUpload.mockResolvedValue({ pad: "uuid.pdf", publieke_url: "https://x/uuid.pdf" });
    mockGetProfiel.mockReset();
    mockGetZaak.mockReset();
    // Standaard: een beheerder schiet in, er is één zaak (KSV).
    mockGetProfiel.mockResolvedValue({ id: "test-user-uuid", rol: "beheerder", opdrachtgever_id: null });
    mockGetZaak.mockResolvedValue({ id: "zaak-ksv", naam: "Keukenstudio Voorschoten" });
  });

  it("hangt de inschoten opdracht aan de (enige) kantoor-zaak", async () => {
    mockParse.mockResolvedValue(parsed("7444"));
    await POST(multipart([pdf("a.pdf")]));
    expect(mockCreateOpdracht.mock.calls[0][0].opdrachtgever_id).toBe("zaak-ksv");
  });

  it("gebruikt de eigen zaak van een opdrachtgever-inschieter", async () => {
    mockGetProfiel.mockResolvedValue({ id: "ed", rol: "opdrachtgever", opdrachtgever_id: "zaak-ed" });
    mockParse.mockResolvedValue(parsed("7445"));
    await POST(multipart([pdf("a.pdf")]));
    expect(mockCreateOpdracht.mock.calls[0][0].opdrachtgever_id).toBe("zaak-ed");
  });

  it("twee PDF's met dezelfde referentie worden één opdracht met twee documenten", async () => {
    mockParse.mockResolvedValue(parsed("7444"));
    const res = await POST(multipart([pdf("7444-a.pdf"), pdf("7444-b.pdf")]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).toHaveBeenCalledTimes(2);
    expect(mockCreateOpdracht).toHaveBeenCalledTimes(1);
    expect(mockAddDocument).toHaveBeenCalledTimes(2);
    expect(body.aantalOpdrachten).toBe(1);
    expect(body.aantalDocumenten).toBe(2);
    expect(body.aangemaakt[0].referentienummer).toBe("7444");
  });

  it("twee PDF's met verschillende referenties worden twee opdrachten", async () => {
    mockParse.mockResolvedValueOnce(parsed("7444")).mockResolvedValueOnce(parsed("7588"));
    const res = await POST(multipart([pdf("7444.pdf"), pdf("7588.pdf")]));
    const body = await res.json();

    expect(mockCreateOpdracht).toHaveBeenCalledTimes(2);
    expect(body.aantalOpdrachten).toBe(2);
  });

  it("een PDF zonder referentie wordt een opdracht met aandacht-markering", async () => {
    mockParse.mockResolvedValue(parsed(null));
    const res = await POST(multipart([pdf("onbekend.pdf")]));
    const body = await res.json();

    expect(body.aangemaakt[0].aandacht).toBe(true);
    expect(body.aangemaakt[0].referentienummer).toBeNull();
  });

  it("zonder bestanden volgt 400", async () => {
    const res = await POST(multipart([]));
    expect(res.status).toBe(400);
    expect(mockCreateOpdracht).not.toHaveBeenCalled();
  });
});
