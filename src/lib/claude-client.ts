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
- "klant_email": het e-mailadres van de klant, vaak in de kop bij "Email-adres" (één adres als string), of null. Bij service-werkbonnen vaak afwezig.
- "klant_naam" uit de klant-/afleveradres-gegevens.
- "adviseur": de adviseur/orderverwerker.
- "leverweek": de "Gepl. leverweek" (bijv. '22/2026') bij een orderbevestiging; null bij een werkbon of als niet vindbaar.
- "keukenzaak": de naam van de keukenzaak/opdrachtgever uit de kop of voettekst van het document (bijv. 'Keukenstudio Voorschoten', 'Keukensale.com Katwijk' of 'Küchen-Dump Almere'); null als niet vindbaar.
- Bij twijfel over een veld: geef null terug, verzin niets.

Adressen ("adressen" en "klant_adres"):
- Het MONTAGE-/afleveradres is waar de keuken geplaatst wordt en waar de monteur heen moet (het klantadres). Geef dit altijd.
- Soms staat er een TWEEDE, ander adres dat ertoe doet: een OPDRACHTGEVER die een DERDE partij is (een bouwbedrijf of aannemer die de opdracht geeft) of een afwijkend FACTUUR-adres. Neem zulke adressen ook op in "adressen" met het juiste soort-label.
- HEEL BELANGRIJK: neem het EIGEN adres van de keukenzaak/showroom NIET op in "adressen". Dat staat vaak in de kop of voettekst bij de bedrijfsnaam, telefoon, e-mail, website of KvK (bijvoorbeeld de showroom van Keukenstudio Voorschoten aan de Kon. Julianalaan 46 te Voorschoten, of Keukensale Katwijk aan de Ambachtsweg te Katwijk). Dat is GEEN montage- of opdrachtgever-adres in deze zin; het hoort bij het veld "keukenzaak", niet bij "adressen". Een gewone klantorder heeft dus maar ÉÉN adres in "adressen": dat van de klant.
- Geef in "adressen" dus alleen het montage-/afleveradres van de klant en eventuele afwijkende opdrachtgever-/factuuradressen van DERDEN. Eén relevant adres? Geef dat ene. Geen adres vindbaar: lege array.
- "klant_adres": het MONTAGE-/afleveradres als je dat met zekerheid kunt aanwijzen; anders null. Verzin niets en gok NIET tussen meerdere ECHTE adressen (klant vs bouwbedrijf); bij die twijfel laat je "klant_adres" null en vertrouw je op "adressen" zodat een mens kiest.

Alleen bij werkbon_service de "meldingen":
- Voor elke artikel-regel met "Uw melding" tekst één item.
- "keller_code" is de specifieke artikelcode (bijv. F-BK-LD-60 of 'KELL'); "omschrijving" is de officiële artikelomschrijving; "melding_tekst" is letterlijk wat onder "Uw melding" staat.

Roep ALTIJD de tool aan, geef nooit een vrij tekstantwoord.`;

const USER_INSTRUCTION =
  "Bepaal het documenttype en extract alle gegevens uit deze keuken-order (PDF of foto) via de tool extract_pdf_data.";

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/**
 * Bouwt de message-content voor de parser. Een order komt binnen als PDF (document-block) of als
 * foto van een papieren/uitgeprinte order (image-block). Onbekende types vallen terug op PDF.
 * Puur en testbaar; raakt geen API.
 */
export function buildOrderContent(
  file: Buffer,
  mediaType: string,
  instruction: string,
): Anthropic.ContentBlockParam[] {
  const data = file.toString("base64");
  const isImage = (IMAGE_MEDIA_TYPES as readonly string[]).includes(mediaType);
  const bron = isImage
    ? ({
        type: "image",
        source: { type: "base64", media_type: mediaType as (typeof IMAGE_MEDIA_TYPES)[number], data },
      } as const)
    : ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      } as const);
  return [bron, { type: "text", text: instruction }];
}

export interface ClaudeClientConfig {
  apiKey: string;
  model: string;
}

export type ParseOrderFn = (file: Buffer, mediaType?: string) => Promise<ParsedPdf>;
/** @deprecated Gebruik ParseOrderFn; alias voor backward-compat. */
export type ParsePdfFn = ParseOrderFn;

export function createParser(config: ClaudeClientConfig): ParseOrderFn {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async function parseOrder(
    file: Buffer,
    mediaType: string = "application/pdf",
  ): Promise<ParsedPdf> {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Extract documenttype, klantgegevens en (bij service) meldinggegevens uit een Keukenstudio-order (PDF of foto).",
          input_schema: ParsedPdfJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: buildOrderContent(file, mediaType, USER_INSTRUCTION),
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

let cachedParser: ParseOrderFn | null = null;

/** Leest een order uit een PDF of een foto (mediaType, default PDF) en geeft de gevalideerde velden terug. */
export function parseOrderWithClaude(
  file: Buffer,
  mediaType: string = "application/pdf",
): Promise<ParsedPdf> {
  if (!cachedParser) {
    const e = env();
    cachedParser = createParser({
      apiKey: e.ANTHROPIC_API_KEY,
      model: e.ANTHROPIC_MODEL,
    });
  }
  return cachedParser(file, mediaType);
}

/** @deprecated Gebruik parseOrderWithClaude. Behouden voor bestaande aanroepers (PDF). */
export function parsePdfWithClaude(pdf: Buffer): Promise<ParsedPdf> {
  return parseOrderWithClaude(pdf, "application/pdf");
}

// ── Beoordeling: bevat één mail mogelijk meerdere opdrachten? ───────────────────────────────────
// Vangnet voor de inbound-flow: een mailtekst kan twee keukens beschrijven, of een tweede order
// die niet als aparte PDF binnenkomt. We laten Claude dit licht inschatten (tekst-only, geen PDF).

const TELLER_TOOL = "beoordeel_opdrachten";

const TELLER_SYSTEM = `Je beoordeelt of een doorgestuurde e-mail één of meerdere afzonderlijke keuken-opdrachten bevat.
Eén opdracht hoort bij één klant op één montage-adres. Bijlagen of tekst die bij DEZELFDE keuken horen (een leidingadvies, een tekening, een toelichting) tellen NIET als aparte opdracht.
Het zijn er meerdere als de mail twee of meer verschillende klanten beschrijft, of twee duidelijk losse opdrachten op verschillende adressen.
Bij twijfel: kies meerdere = true; een onterechte waarschuwing kost de monteur één tik, een gemiste splitsing kost hem gezichtsverlies bij de klant.
Geef per herkende opdracht een kort kop-record (klant_naam, klant_adres, referentienummer, werkomschrijving), met null waar je het niet weet. Bij meerdere = false geef je een lege of eenkoppige lijst.
Roep ALTIJD de tool beoordeel_opdrachten aan, geef nooit een vrij tekstantwoord.`;

const TELLER_SCHEMA = {
  type: "object",
  properties: {
    meerdere: { type: "boolean", description: "True als de mail mogelijk meer dan één afzonderlijke opdracht bevat." },
    reden: { type: "string", description: "Korte uitleg voor de monteur waarom (in het Nederlands)." },
    delen: {
      type: "array",
      description: "Per herkende opdracht een kop-record.",
      items: {
        type: "object",
        properties: {
          klant_naam: { type: ["string", "null"] },
          klant_adres: { type: ["string", "null"] },
          referentienummer: { type: ["string", "null"] },
          werkomschrijving: { type: ["string", "null"] },
        },
        required: ["klant_naam", "klant_adres", "referentienummer", "werkomschrijving"],
      },
    },
  },
  required: ["meerdere", "reden", "delen"],
};

export interface MeerdereOpdrachtenDeel {
  klant_naam: string | null;
  klant_adres: string | null;
  referentienummer: string | null;
  werkomschrijving: string | null;
}

export interface MeerdereOpdrachtenOordeel {
  meerdere: boolean;
  reden: string;
  delen: MeerdereOpdrachtenDeel[];
}

export type BeoordeelFn = (
  mailtekst: string,
  bekendeKoppen: Array<{ klant_naam: string | null; referentienummer: string | null }>,
) => Promise<MeerdereOpdrachtenOordeel>;

export function createBeoordelaar(config: ClaudeClientConfig): BeoordeelFn {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async function beoordeel(mailtekst, bekendeKoppen) {
    const koppenTekst = bekendeKoppen.length
      ? "Reeds herkende koppen uit de bijlagen:\n" +
        bekendeKoppen.map((k) => `- ${k.klant_naam ?? "(geen naam)"} (ref ${k.referentienummer ?? "?"})`).join("\n")
      : "Er zijn geen bijlagen herkend; beoordeel alleen de mailtekst.";

    const response = await client.messages.create({
      model: config.model,
      max_tokens: 1024,
      system: TELLER_SYSTEM,
      tools: [
        {
          name: TELLER_TOOL,
          description: "Bepaal of een doorgestuurde mail één of meerdere afzonderlijke keuken-opdrachten bevat.",
          input_schema: TELLER_SCHEMA as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: TELLER_TOOL },
      messages: [{ role: "user", content: `${koppenTekst}\n\nMailtekst:\n${mailtekst || "(leeg)"}` }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error("Claude gaf geen tool_use response bij het beoordelen van meerdere opdrachten.");
    }

    const input = toolUse.input as Partial<MeerdereOpdrachtenOordeel> & {
      delen?: Array<Partial<MeerdereOpdrachtenDeel>>;
    };
    return {
      meerdere: Boolean(input.meerdere),
      reden: typeof input.reden === "string" ? input.reden : "",
      delen: Array.isArray(input.delen)
        ? input.delen.map((d) => ({
            klant_naam: d.klant_naam ?? null,
            klant_adres: d.klant_adres ?? null,
            referentienummer: d.referentienummer ?? null,
            werkomschrijving: d.werkomschrijving ?? null,
          }))
        : [],
    };
  };
}

let cachedBeoordelaar: BeoordeelFn | null = null;

/** Schat in of een binnengekomen mail mogelijk meerdere afzonderlijke opdrachten bevat (tekst-only). */
export function beoordeelMeerdereOpdrachten(
  mailtekst: string,
  bekendeKoppen: Array<{ klant_naam: string | null; referentienummer: string | null }>,
): Promise<MeerdereOpdrachtenOordeel> {
  if (!cachedBeoordelaar) {
    const e = env();
    cachedBeoordelaar = createBeoordelaar({ apiKey: e.ANTHROPIC_API_KEY, model: e.ANTHROPIC_MODEL });
  }
  return cachedBeoordelaar(mailtekst, bekendeKoppen);
}
