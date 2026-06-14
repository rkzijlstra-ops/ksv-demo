import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_config: unknown) {}
  },
}));

// Pas importeren NA vi.mock zodat de mock wordt opgepikt
import { createParser, buildOrderContent } from "./claude-client";

const dummyPdf = Buffer.from("%PDF-1.4 fake pdf bytes", "utf-8");

const validToolUseResponse = {
  content: [
    {
      type: "tool_use",
      name: "extract_pdf_data",
      input: {
        klant_naam: "J. Jansen",
        klant_adres: "Hoofdstraat 12",
        referentienummer: "7444",
        adviseur: "M. de Vries",
        klant_telefoon: "071-1234567",
        klant_email: "j.jansen@voorbeeld.nl",
        documenttype: "werkbon_service",
        leverweek: null,
        keukenzaak: "Keukenstudio Voorschoten",
        meldingen: [
          {
            keller_code: "F-BK-LD-60",
            omschrijving: "Front bovenkast linksdraaiend 60cm",
            melding_tekst: "Beschadigd bij ontvangst",
          },
        ],
      },
    },
  ],
};

const orderbevestigingResponse = {
  content: [
    {
      type: "tool_use",
      name: "extract_pdf_data",
      input: {
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
      },
    },
  ],
};

describe("createParser", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("roept Anthropic aan met juiste model, tool, en PDF base64", async () => {
    mockCreate.mockResolvedValue(validToolUseResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    await parse(dummyPdf);

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.model).toBe("claude-sonnet-4-6");
    expect(callArg.tools).toBeDefined();
    expect(callArg.tools[0].name).toBe("extract_pdf_data");
    expect(callArg.tool_choice).toEqual({ type: "tool", name: "extract_pdf_data" });
    // PDF moet als document message worden meegestuurd
    const docBlock = callArg.messages[0].content.find(
      (c: { type: string }) => c.type === "document",
    );
    expect(docBlock).toBeDefined();
    expect(docBlock.source.media_type).toBe("application/pdf");
    expect(docBlock.source.data).toBe(dummyPdf.toString("base64"));
  });

  it("returnt gevalideerde ParsedPdf uit tool_use", async () => {
    mockCreate.mockResolvedValue(validToolUseResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    const result = await parse(dummyPdf);

    expect(result.klant_naam).toBe("J. Jansen");
    expect(result.referentienummer).toBe("7444");
    // klant_email komt uit de PDF-kop ("Email-adres") en moet door de keten heen blijven,
    // want het is de voorinvulwaarde voor de klant-versie van het opleverrapport.
    expect(result.klant_email).toBe("j.jansen@voorbeeld.nl");
    expect(result.meldingen).toHaveLength(1);
    expect(result.meldingen[0].keller_code).toBe("F-BK-LD-60");
  });

  it("returnt orderbevestiging-type met leverweek en lege meldingen", async () => {
    mockCreate.mockResolvedValue(orderbevestigingResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    const result = await parse(dummyPdf);

    expect(result.documenttype).toBe("orderbevestiging");
    expect(result.leverweek).toBe("22/2026");
    expect(result.meldingen).toEqual([]);
    expect(result.referentienummer).toBe("7407");
  });

  it("returnt documenttype werkbon_service voor een service-PDF", async () => {
    mockCreate.mockResolvedValue(validToolUseResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    const result = await parse(dummyPdf);

    expect(result.documenttype).toBe("werkbon_service");
    expect(result.meldingen).toHaveLength(1);
  });

  it("instrueert Claude om het documenttype te bepalen (orderbevestiging vs werkbon)", async () => {
    mockCreate.mockResolvedValue(orderbevestigingResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    await parse(dummyPdf);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.system).toMatch(/orderbevestiging/i);
    expect(callArg.system).toMatch(/werkbon/i);
  });

  it("gooit informatieve error als Claude geen tool_use teruggeeft", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Sorry, kan PDF niet lezen" }],
    });
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    await expect(parse(dummyPdf)).rejects.toThrow(/tool_use/);
  });

  it("gooit Zod-error als tool_use input niet aan schema voldoet", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          name: "extract_pdf_data",
          input: { klant_naam: "X" }, // mist verplichte velden
        },
      ],
    });
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    await expect(parse(dummyPdf)).rejects.toThrow();
  });

  it("stuurt een foto als image-block mee (parser leest ook beeld)", async () => {
    mockCreate.mockResolvedValue(validToolUseResponse);
    const parse = createParser({ apiKey: "sk-ant-test", model: "claude-sonnet-4-6" });

    await parse(dummyPdf, "image/jpeg");

    const callArg = mockCreate.mock.calls[0][0];
    const imgBlock = callArg.messages[0].content.find(
      (c: { type: string }) => c.type === "image",
    );
    expect(imgBlock).toBeDefined();
    expect(imgBlock.source.media_type).toBe("image/jpeg");
    expect(imgBlock.source.data).toBe(dummyPdf.toString("base64"));
  });
});

const buf = Buffer.from("hallo");

describe("buildOrderContent", () => {
  it("maakt een document-block voor een PDF", () => {
    const content = buildOrderContent(buf, "application/pdf", "lees dit");
    expect(content[0].type).toBe("document");
    // @ts-expect-error source bestaat op document-block
    expect(content[0].source.media_type).toBe("application/pdf");
    // @ts-expect-error source bestaat op document-block
    expect(content[0].source.data).toBe(buf.toString("base64"));
  });

  it("maakt een image-block voor een foto (jpeg/png/webp)", () => {
    for (const mt of ["image/jpeg", "image/png", "image/webp"]) {
      const content = buildOrderContent(buf, mt, "lees dit");
      expect(content[0].type).toBe("image");
      // @ts-expect-error source bestaat op image-block
      expect(content[0].source.media_type).toBe(mt);
    }
  });

  it("valt terug op een document-block (pdf) bij een onbekend type", () => {
    const content = buildOrderContent(buf, "application/octet-stream", "lees dit");
    expect(content[0].type).toBe("document");
    // @ts-expect-error source bestaat op document-block
    expect(content[0].source.media_type).toBe("application/pdf");
  });

  it("zet de instructie als tekst-block erachter", () => {
    const content = buildOrderContent(buf, "application/pdf", "lees dit");
    const tekst = content[content.length - 1];
    expect(tekst.type).toBe("text");
    // @ts-expect-error text bestaat op text-block
    expect(tekst.text).toBe("lees dit");
  });
});
