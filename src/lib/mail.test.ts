import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Melding } from "./db";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
    constructor(_key: string) {}
  },
}));

import { verstuurOpleverRapport } from "./mail";

function opdracht(over: Partial<Melding> = {}): Melding {
  return {
    id: "opdr-1",
    klant_naam: "van Dijk",
    referentienummer: "7407",
  } as Melding & typeof over;
}

const basis = {
  naar: "rein@example.com",
  pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  bestandsnaam: "opleverrapport-7407.pdf",
};

const ORIG = process.env;

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  process.env = { ...ORIG, RESEND_API_KEY: "re_test_key", RESEND_FROM: "" };
});
afterEach(() => {
  process.env = ORIG;
});

describe("verstuurOpleverRapport", () => {
  it("verstuurt via Resend met juiste to/subject/attachment", async () => {
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });

    expect(mockSend).toHaveBeenCalledOnce();
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe("rein@example.com");
    expect(arg.subject).toMatch(/van Dijk/);
    expect(arg.subject).toMatch(/7407/);
    expect(arg.attachments).toHaveLength(1);
    expect(arg.attachments[0].filename).toBe("opleverrapport-7407.pdf");
  });

  it("gebruikt onboarding@resend.dev als afzender wanneer RESEND_FROM leeg is", async () => {
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });
    expect(mockSend.mock.calls[0][0].from).toBe("onboarding@resend.dev");
  });

  it("gebruikt RESEND_FROM wanneer ingevuld", async () => {
    process.env.RESEND_FROM = "rapport@mijndomein.nl";
    await verstuurOpleverRapport({ ...basis, opdracht: opdracht() });
    expect(mockSend.mock.calls[0][0].from).toBe("rapport@mijndomein.nl");
  });

  it("gooit een duidelijke error als RESEND_API_KEY ontbreekt", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(
      verstuurOpleverRapport({ ...basis, opdracht: opdracht() }),
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("gooit een error als Resend een fout teruggeeft", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    await expect(
      verstuurOpleverRapport({ ...basis, opdracht: opdracht() }),
    ).rejects.toThrow(/domain not verified/);
  });
});
