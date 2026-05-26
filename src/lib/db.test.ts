import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPdf } from "./parser-schema";

const { mockSingle, mockSelect, mockInsert, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ insert: mockInsert }));
  return { mockSingle, mockSelect, mockInsert, mockFrom };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { createDb } from "./db";

const validParsedPdf: ParsedPdf = {
  klant_naam: "J. Jansen",
  klant_adres: "Hoofdstraat 12",
  referentienummer: "7444",
  adviseur: "M. de Vries",
  meldingen: [
    {
      keller_code: "F-BK-LD-60",
      omschrijving: "Front bovenkast linksdraaiend 60cm",
      melding_tekst: "Beschadigd bij ontvangst",
    },
  ],
};

describe("createDb -> insertPdfMelding", () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockSelect.mockClear();
    mockInsert.mockClear();
    mockFrom.mockClear();
  });

  it("insert in 'meldingen' tabel met bron='pdf' en alle parser-velden", async () => {
    mockSingle.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    const db = createDb({ url: "https://x.supabase.co", secretKey: "sb_secret_xxx" });

    await db.insertPdfMelding(validParsedPdf);

    expect(mockFrom).toHaveBeenCalledWith("meldingen");
    expect(mockInsert).toHaveBeenCalledWith({
      bron: "pdf",
      ...validParsedPdf,
    });
  });

  it("returnt id van de aangemaakte rij", async () => {
    mockSingle.mockResolvedValue({ data: { id: "abc-123" }, error: null });
    const db = createDb({ url: "https://x.supabase.co", secretKey: "sb_secret_xxx" });

    const result = await db.insertPdfMelding(validParsedPdf);

    expect(result.id).toBe("abc-123");
  });

  it("gooit Error met Supabase-message als insert faalt", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table meldingen" },
    });
    const db = createDb({ url: "https://x.supabase.co", secretKey: "sb_secret_xxx" });

    await expect(db.insertPdfMelding(validParsedPdf)).rejects.toThrow(
      /permission denied/,
    );
  });
});
