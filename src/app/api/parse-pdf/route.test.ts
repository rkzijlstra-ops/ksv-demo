import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "@/lib/parser-schema";

const { mockParse, mockInsert } = vi.hoisted(() => ({
  mockParse: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/claude-client", () => ({
  parsePdfWithClaude: mockParse,
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ insertPdfMelding: mockInsert }),
}));

import { POST } from "./route";

const dummyParsed: ParsedPdf = {
  klant_naam: "J. Jansen",
  klant_adres: "Hoofdstraat 12",
  referentienummer: "7444",
  adviseur: "M. de Vries",
  klant_telefoon: "071-1234567",
  documenttype: "werkbon_service",
  leverweek: null,
  meldingen: [
    {
      keller_code: "F-BK-LD-60",
      omschrijving: "Front bovenkast linksdraaiend 60cm",
      melding_tekst: "Beschadigd",
    },
  ],
};

function buildRequest(file: File): Request {
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://localhost/api/parse-pdf", { method: "POST", body: fd });
}

describe("POST /api/parse-pdf", () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockInsert.mockReset();
  });

  it("happy path: parseert PDF en geeft 200 + JSON met id terug", async () => {
    mockParse.mockResolvedValue(dummyParsed);
    mockInsert.mockResolvedValue({ id: "row-abc" });

    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "voorbeeld.pdf", {
      type: "application/pdf",
    });
    const res = await POST(buildRequest(file));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("row-abc");
    expect(body.klant_naam).toBe("J. Jansen");
    expect(body.referentienummer).toBe("7444");
    expect(mockParse).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledWith(dummyParsed);
  });

  it("geeft 400 als 'file' veld ontbreekt", async () => {
    const fd = new FormData();
    const req = new Request("http://localhost/api/parse-pdf", { method: "POST", body: fd });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("geeft 413 als PDF groter is dan 10 MB", async () => {
    const bigBuffer = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([bigBuffer], "groot.pdf", { type: "application/pdf" });

    const res = await POST(buildRequest(file));
    expect(res.status).toBe(413);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("geeft 502 als Claude-parser faalt", async () => {
    mockParse.mockRejectedValue(new Error("Claude gaf geen tool_use"));

    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "voorbeeld.pdf", {
      type: "application/pdf",
    });
    const res = await POST(buildRequest(file));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/Claude/);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("geeft 503 als DB-insert faalt", async () => {
    mockParse.mockResolvedValue(dummyParsed);
    mockInsert.mockRejectedValue(new Error("DB insert mislukt: connection refused"));

    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "voorbeeld.pdf", {
      type: "application/pdf",
    });
    const res = await POST(buildRequest(file));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/DB/);
  });
});
