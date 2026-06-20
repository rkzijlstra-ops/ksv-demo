import { parseOrderWithClaude } from "./claude-client";
import { eerstePaginaPdf } from "./pdf-eerste-pagina";
import { groepeerDocumenten, voegOrderSamen } from "./order-groep";
import type { ParsedPdf } from "./parser-schema";

export interface InvoerBestand {
  naam: string;
  mediaType: string;
  buffer: Buffer;
}

export interface KlusGroep {
  /** Indexen (in de meegegeven bestandenlijst) die bij deze klus horen. */
  bestand_indices: number[];
  /** Samengevoegde velden van de documenten in deze groep. */
  velden: ParsedPdf;
}

export interface InleesResultaat {
  groepen: KlusGroep[];
  /** Indexen van bestanden zonder herkenbare klus (de invoerder wijst die toe). */
  ongegroepeerd: number[];
  /** Per bestand de ruwe parse, of null bij een fout. */
  perDocument: (ParsedPdf | null)[];
  /** Per bestand de foutreden, of null bij succes. */
  foutPerDocument: (string | null)[];
}

type ParseFn = (buffer: Buffer, mediaType?: string) => Promise<ParsedPdf>;

/**
 * Leest elk bestand in (alleen de eerste pagina van een PDF, scheelt kosten) en groepeert de documenten
 * per klus. Een bestand dat niet leesbaar is, valt onder `ongegroepeerd` met zijn foutreden bewaard.
 * De parser is injecteerbaar zodat de orkestratie zonder echte Claude getest kan worden.
 */
export async function leesEnGroepeer(
  bestanden: InvoerBestand[],
  parse: ParseFn = parseOrderWithClaude,
): Promise<InleesResultaat> {
  const perDocument: (ParsedPdf | null)[] = [];
  const foutPerDocument: (string | null)[] = [];

  for (const b of bestanden) {
    try {
      const buf = b.mediaType === "application/pdf" ? await eerstePaginaPdf(b.buffer) : b.buffer;
      perDocument.push(await parse(buf, b.mediaType));
      foutPerDocument.push(null);
    } catch (e) {
      perDocument.push(null);
      foutPerDocument.push((e as Error).message);
    }
  }

  const { groepen, ongegroepeerd } = groepeerDocumenten(
    perDocument.map((p, index) => ({
      index,
      referentienummer: p?.referentienummer ?? null,
      klant_naam: p?.klant_naam ?? null,
      bestandsnaam: bestanden[index]?.naam,
    })),
  );

  const klusGroepen: KlusGroep[] = groepen.map((indices) => ({
    bestand_indices: indices,
    velden: voegOrderSamen(
      indices.map((i) => perDocument[i]).filter((p): p is ParsedPdf => p !== null),
    ),
  }));

  return { groepen: klusGroepen, ongegroepeerd, perDocument, foutPerDocument };
}
