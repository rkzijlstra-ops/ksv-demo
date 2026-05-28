import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_config: unknown) {}
  },
}));

// Pas importeren NA vi.mock zodat de mock wordt opgepikt
import { createParser } from "./claude-client";

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
    expect(result.meldingen).toHaveLength(1);
    expect(result.meldingen[0].keller_code).toBe("F-BK-LD-60");
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
});
