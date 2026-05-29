import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "@/lib/parser-schema";

const { mockParse, mockCreateOpdracht, mockAddDocument, mockUpload } = vi.hoisted(() => ({
  mockParse: vi.fn(),
  mockCreateOpdracht: vi.fn(),
  mockAddDocument: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.mock("@/lib/claude-client", () => ({ parsePdfWithClaude: mockParse }));
vi.mock("@/lib/db", () => ({
  db: () => ({ createOpdracht: mockCreateOpdracht, addDocument: mockAddDocument }),
}));
vi.mock("@/lib/storage", () => ({
  storage: () => ({ uploadOpdrachtDocument: mockUpload }),
}));

import { POST } from "./route";

const orderParsed: ParsedPdf = {
  klant_naam: "De heer en mevrouw van Dijk",
  klant_adres: "Hoge Morsweg 37, 2332 HG Leiden",
  referentienummer: "7407",
  adviseur: "Marco van Leeuwen",
  klant_telefoon: "06-40200603",
  documenttype: "orderbevestiging",
  leverweek: "22/2026",
  meldingen: [],
};

function pdfFile(name = "7407.pdf"): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: "application/pdf" });
}
function pngFile(name = "schets.png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: "image/png" });
}

function multipart(files: File[], velden: Record<string, string> = {}): Request {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  Object.entries(velden).forEach(([k, v]) => fd.append(k, v));
  return new Request("http://localhost/api/opdrachten", { method: "POST", body: fd });
}

describe("POST /api/opdrachten", () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockCreateOpdracht.mockReset();
    mockAddDocument.mockReset();
    mockUpload.mockReset();
    mockCreateOpdracht.mockResolvedValue({ id: "opdr-1" });
    mockAddDocument.mockResolvedValue({ id: "doc-x" });
    mockUpload.mockResolvedValue({ pad: "uuid.pdf", publieke_url: "https://x/opdracht-documenten/uuid.pdf" });
  });

  it("één PDF: parseert kop, maakt opdracht + 1 primair document, 200", async () => {
    mockParse.mockResolvedValue(orderParsed);

    const res = await POST(multipart([pdfFile()]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).toHaveBeenCalledOnce();
    const opdrachtArg = mockCreateOpdracht.mock.calls[0][0];
    expect(opdrachtArg.documenttype).toBe("orderbevestiging");
    expect(opdrachtArg.referentienummer).toBe("7407");
    expect(opdrachtArg.leverweek).toBe("22/2026");
    expect(mockAddDocument).toHaveBeenCalledOnce();
    expect(mockAddDocument.mock.calls[0][0].is_primair).toBe(true);
    expect(body.id).toBe("opdr-1");
    expect(body.documenten).toHaveLength(1);
  });

  it("PDF + PNG: parseert alleen de PDF, maakt 2 documenten (1 pdf, 1 afbeelding)", async () => {
    mockParse.mockResolvedValue(orderParsed);

    const res = await POST(multipart([pdfFile(), pngFile()]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).toHaveBeenCalledOnce(); // alleen de PDF
    expect(mockAddDocument).toHaveBeenCalledTimes(2);
    const types = mockAddDocument.mock.calls.map((c) => c[0].type);
    expect(types).toContain("pdf");
    expect(types).toContain("afbeelding");
    expect(body.documenten).toHaveLength(2);
  });

  it("tekst-only (geen files): maakt opdracht documenttype 'tekst' zonder documenten", async () => {
    const res = await POST(
      multipart([], {
        klant_naam: "Mevrouw Veering",
        klant_adres: "Voorschoten",
        referentienummer: "9001",
        klant_telefoon: "06-12345678",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).not.toHaveBeenCalled();
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.documenttype).toBe("tekst");
    expect(arg.klant_naam).toBe("Mevrouw Veering");
    expect(mockAddDocument).not.toHaveBeenCalled();
    expect(body.documenten).toEqual([]);
  });

  it("alleen een afbeelding (geen PDF): opdracht 'onbekend', parser niet aangeroepen", async () => {
    const res = await POST(multipart([pngFile()]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).not.toHaveBeenCalled();
    expect(mockCreateOpdracht.mock.calls[0][0].documenttype).toBe("onbekend");
    expect(mockAddDocument).toHaveBeenCalledOnce();
    expect(mockAddDocument.mock.calls[0][0].type).toBe("afbeelding");
    expect(body.documenten).toHaveLength(1);
  });

  it("parser faalt op de PDF: opdracht wordt tóch aangemaakt met lege kop + document bewaard", async () => {
    mockParse.mockRejectedValue(new Error("Claude kapot"));

    const res = await POST(multipart([pdfFile()]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateOpdracht.mock.calls[0][0].documenttype).toBe("onbekend");
    expect(mockAddDocument).toHaveBeenCalledOnce();
    expect(body.documenten).toHaveLength(1);
  });

  it("geen files en geen klantgegevens: 400", async () => {
    const res = await POST(multipart([]));
    expect(res.status).toBe(400);
    expect(mockCreateOpdracht).not.toHaveBeenCalled();
  });
});
