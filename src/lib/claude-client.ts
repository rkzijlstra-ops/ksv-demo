import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import {
  ParsedPdfJsonSchema,
  ParsedPdfSchema,
  type ParsedPdf,
} from "./parser-schema";

const TOOL_NAME = "extract_pdf_data";

const SYSTEM_PROMPT = `Je bent een nauwkeurige extractie-assistent voor Keukenstudio Voorschoten.
Je krijgt een PDF van een service-melding (Keller-format) en je gebruikt de tool "extract_pdf_data" om de gegevens gestructureerd terug te geven.

Regels:
- Geef het referentienummer altijd als string terug (ook al staat het in de PDF als cijfer).
- "klant_telefoon": het telefoonnummer van de klant als string (bijv. '071-1234567' of '06-12345678'), of null als er geen nummer in de PDF staat.
- Bij twijfel over een veld: geef null terug, verzin niets.
- Voor "meldingen": voor elke artikel-regel met "Uw melding" tekst één item in de array.
- "keller_code" is de specifieke Keller-artikelcode (vaak gecodeerd, bijv. F-BK-LD-60).
- "omschrijving" is de officiële artikelomschrijving naast de code.
- "melding_tekst" is letterlijk wat onder "Uw melding" staat voor dat artikel.

Roep ALTIJD de tool aan, geef nooit een vrije tekstantwoord.`;

const USER_INSTRUCTION =
  "Extract alle gegevens uit deze Keukenstudio service-PDF via de tool extract_pdf_data.";

export interface ClaudeClientConfig {
  apiKey: string;
  model: string;
}

export type ParsePdfFn = (pdf: Buffer) => Promise<ParsedPdf>;

export function createParser(config: ClaudeClientConfig): ParsePdfFn {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async function parsePdf(pdf: Buffer): Promise<ParsedPdf> {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Extract klant- en meldinggegevens uit een Keukenstudio service-PDF (Keller-format).",
          input_schema: ParsedPdfJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdf.toString("base64"),
              },
            },
            { type: "text", text: USER_INSTRUCTION },
          ],
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      throw new Error(
        `Claude gaf geen tool_use response (forceer-tool faalde). Tekst-output:\n${textBlocks || "(leeg)"}`,
      );
    }

    return ParsedPdfSchema.parse(toolUse.input);
  };
}

let cachedParser: ParsePdfFn | null = null;

export function parsePdfWithClaude(pdf: Buffer): Promise<ParsedPdf> {
  if (!cachedParser) {
    const e = env();
    cachedParser = createParser({
      apiKey: e.ANTHROPIC_API_KEY,
      model: e.ANTHROPIC_MODEL,
    });
  }
  return cachedParser(pdf);
}
