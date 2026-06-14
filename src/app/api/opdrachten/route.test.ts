import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "@/lib/parser-schema";

const { mockParse, mockCreateOpdracht, mockAddDocument, mockUpload, mockGetProfiel, mockStandaard } =
  vi.hoisted(() => ({
    mockParse: vi.fn(),
    mockCreateOpdracht: vi.fn(),
    mockAddDocument: vi.fn(),
    mockUpload: vi.fn(),
    mockGetProfiel: vi.fn(),
    mockStandaard: vi.fn(),
  }));

vi.mock("@/lib/claude-client", () => ({
  parseOrderWithClaude: mockParse,
  parsePdfWithClaude: mockParse,
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    createOpdracht: mockCreateOpdracht,
    addDocument: mockAddDocument,
    getProfiel: mockGetProfiel,
    getStandaardOpdrachtgever: mockStandaard,
  }),
}));
vi.mock("@/lib/storage", () => ({
  storage: () => ({ uploadOpdrachtDocument: mockUpload }),
}));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

const orderParsed: ParsedPdf = {
  klant_naam: "De heer en mevrouw van Dijk",
  klant_adres: "Hoge Morsweg 37, 2332 HG Leiden",
  referentienummer: "7407",
  adviseur: "Marco van Leeuwen",
  klant_telefoon: "06-40200603",
  klant_email: "vandijk@voorbeeld.nl",
  documenttype: "orderbevestiging",
  leverweek: "22/2026",
  keukenzaak: "Keukensale.com Katwijk",
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
    mockGetProfiel.mockReset();
    mockStandaard.mockReset();
    // standaard: de inschieter is een monteur (zelf-invoer → eigen werkpool, ad-hoc)
    mockGetProfiel.mockResolvedValue({ id: "test-user-uuid", rol: "monteur" });
    mockStandaard.mockResolvedValue({ id: "zaak-standaard" });
  });

  it("monteur (zelf-invoer): klus aan zichzelf toegewezen, geen opdrachtgever (ad-hoc)", async () => {
    await POST(multipart([], { klant_naam: "Mevrouw Veering" }));
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.toegewezen_aan).toBe("test-user-uuid");
    expect(arg.opdrachtgever_id).toBeNull();
  });

  it("kantoor (opdrachtgever): klus aan eigen zaak, niet toegewezen (te plannen)", async () => {
    mockGetProfiel.mockResolvedValue({ id: "test-user-uuid", rol: "opdrachtgever", opdrachtgever_id: "zaak-ksv" });
    await POST(multipart([], { klant_naam: "Fam. De Bruijn" }));
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.opdrachtgever_id).toBe("zaak-ksv");
    expect(arg.toegewezen_aan).toBeNull();
  });

  it("kantoor (beheerder): valt terug op de standaard-zaak", async () => {
    mockGetProfiel.mockResolvedValue({ id: "test-user-uuid", rol: "beheerder" });
    await POST(multipart([], { klant_naam: "Fam. De Bruijn" }));
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.opdrachtgever_id).toBe("zaak-standaard");
    expect(arg.toegewezen_aan).toBeNull();
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
    expect(opdrachtArg.user_id).toBe("test-user-uuid");
    expect(mockAddDocument).toHaveBeenCalledOnce();
    expect(mockAddDocument.mock.calls[0][0].is_primair).toBe(true);
    expect(mockAddDocument.mock.calls[0][0].user_id).toBe("test-user-uuid");
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

  it("werkomschrijving wordt meegegeven aan createOpdracht", async () => {
    const res = await POST(
      multipart([], { klant_naam: "Mevrouw Veering", werkomschrijving: "kasten nastellen" }),
    );
    expect(res.status).toBe(200);
    expect(mockCreateOpdracht.mock.calls[0][0].werkomschrijving).toBe("kasten nastellen");
  });

  it("alleen een werkomschrijving (geen files, geen klantvelden) telt als ingevuld: 200", async () => {
    const res = await POST(multipart([], { werkomschrijving: "kasten nastellen" }));
    expect(res.status).toBe(200);
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.documenttype).toBe("tekst");
    expect(arg.werkomschrijving).toBe("kasten nastellen");
  });

  it("alleen een foto (geen PDF): leest de foto uit (order-foto) en bewaart de afbeelding", async () => {
    mockParse.mockResolvedValue(orderParsed);

    const res = await POST(multipart([pngFile()]));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Een foto van een papieren order wordt nu wél uitgelezen (Claude vision).
    expect(mockParse).toHaveBeenCalledOnce();
    expect(mockParse.mock.calls[0][1]).toBe("image/png"); // mediaType meegegeven
    expect(mockCreateOpdracht.mock.calls[0][0].documenttype).toBe("orderbevestiging");
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

  it("actie=parse: leest de PDF uit en geeft de velden terug, maakt NIETS aan", async () => {
    mockParse.mockResolvedValue(orderParsed);

    const res = await POST(multipart([pdfFile()], { actie: "parse" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).toHaveBeenCalledOnce();
    expect(body.parsed.klant_naam).toBe("De heer en mevrouw van Dijk");
    expect(mockCreateOpdracht).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("actie=parse met alleen een foto: leest de foto uit (order-foto), 200", async () => {
    mockParse.mockResolvedValue(orderParsed);

    const res = await POST(multipart([pngFile()], { actie: "parse" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).toHaveBeenCalledOnce();
    expect(mockParse.mock.calls[0][1]).toBe("image/png");
    expect(body.parsed.klant_naam).toBe("De heer en mevrouw van Dijk");
    expect(mockCreateOpdracht).not.toHaveBeenCalled();
  });

  it("actie=parse zonder PDF of foto: 400", async () => {
    const res = await POST(multipart([], { actie: "parse" }));
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("ingevulde velden + document: gebruikt de velden (geen herparse), bewaart het document, zet de datum", async () => {
    const res = await POST(
      multipart([pdfFile()], {
        klant_naam: "Eigen klus Veering",
        klant_email: "veering@voorbeeld.nl",
        startdatum: "2026-06-15",
        starttijd: "09:00",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockParse).not.toHaveBeenCalled(); // de ingevulde velden zijn leidend
    const arg = mockCreateOpdracht.mock.calls[0][0];
    expect(arg.klant_naam).toBe("Eigen klus Veering");
    expect(arg.klant_email).toBe("veering@voorbeeld.nl");
    expect(arg.startdatum).toBe("2026-06-15");
    expect(arg.starttijd).toBe("09:00");
    expect(arg.documenttype).toBe("onbekend"); // document aanwezig, niet geparsed
    expect(mockAddDocument).toHaveBeenCalledOnce();
    expect(body.documenten).toHaveLength(1);
  });
});
