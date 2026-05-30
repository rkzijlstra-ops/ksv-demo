import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import {
  ParsedPdfJsonSchema,
  ParsedPdfSchema,
  type ParsedPdf,
} from "./parser-schema";

const TOOL_NAME = "extract_pdf_data";

const SYSTEM_PROMPT = `Je bent een nauwkeurige extractie-assistent voor keukenmontage-opdrachten.
Je krijgt een PDF van een keukenzaak (bijvoorbeeld Keukenstudio Voorschoten, Keukensale.com Katwijk of Küchen-Dump) en gebruikt de tool "extract_pdf_data" om de gegevens gestructureerd terug te geven.

Bepaal EERST het documenttype:
- "orderbevestiging": een montage-order. Herkenbaar aan de titel "Orderbevestiging" en een regel "Gepl. leverweek", met een kop (Referentienummer, Orderbev.nr, Orderverwerker, Datum order, Adviseur, Telefoon klant, Email-adres) en daaronder apparatuur en/of keukenmeubelen-specificaties. Heeft GEEN "Uw melding"-regels. Laat "meldingen" dan een LEGE array.
- "werkbon_service": een service-werkbon. Herkenbaar aan "WERKBON SERVICE" en een blok "Uw melding" met klachten. Vul "meldingen" dan met één item per melding-regel.
- "onbekend": als geen van beide duidelijk past. Doe een beste-poging op de kop-velden.

Kop-velden (gelden voor beide types):
- Geef het referentienummer altijd als string terug (ook al staat het als cijfer).
- "klant_telefoon": telefoonnummer van de klant als string (bijv. '071-1234567' of '06-12345678'), of null. Staan er meerdere nummers, neem ze samen in één string.
- "klant_naam" en "klant_adres" uit de klant-/afleveradres-gegevens.
- "adviseur": de adviseur/orderverwerker.
- "leverweek": de "Gepl. leverweek" (bijv. '22/2026') bij een orderbevestiging; null bij een werkbon of als niet vindbaar.
- "keukenzaak": de naam van de keukenzaak/opdrachtgever uit de kop of voettekst van het document (bijv. 'Keukenstudio Voorschoten', 'Keukensale.com Katwijk' of 'Küchen-Dump Almere'); null als niet vindbaar.
- Bij twijfel over een veld: geef null terug, verzin niets.

Alleen bij werkbon_service de "meldingen":
- Voor elke artikel-regel met "Uw melding" tekst één item.
- "keller_code" is de specifieke artikelcode (bijv. F-BK-LD-60 of 'KELL'); "omschrijving" is de officiële artikelomschrijving; "melding_tekst" is letterlijk wat onder "Uw melding" staat.

Roep ALTIJD de tool aan, geef nooit een vrij tekstantwoord.`;

const USER_INSTRUCTION =
  "Bepaal het documenttype en extract alle gegevens uit deze keuken-PDF via de tool extract_pdf_data.";

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
            "Extract documenttype, klantgegevens en (bij service) meldinggegevens uit een Keukenstudio-PDF.",
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
