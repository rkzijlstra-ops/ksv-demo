import type { OpdrachtInput } from "@/lib/db";
import { naamKern } from "@/lib/order-groep";

/**
 * Eén deel van een voorgestelde splitsing: de kop-velden van die klus plus de id's van de documenten
 * die erbij horen. `document_ids` is leeg als het deel alleen uit mailtekst komt (geen PDF).
 */
export interface SplitsDeel {
  velden: Partial<OpdrachtInput>;
  document_ids: string[];
}

/** De door de AI/heuristiek voorgestelde splitsing van één binnengekomen mail in meerdere klussen. */
export type SplitsVoorstel = SplitsDeel[];

/** Eén geparste PDF-kop met zijn positie in de bijlagenlijst, voor de klant-heuristiek. */
export interface KopMetIndex {
  klant_naam: string | null;
  klant_adres: string | null;
  referentienummer: string | null;
  pdfIndex: number;
}

/**
 * Heuristiek voor de PDF-flow: zitten er in één samengevoegde groep meerdere verschillende klanten?
 * Vergelijkt op `naamKern` (titels/initialen/tussenvoegsels eruit), met het adres als terugval wanneer
 * een naam ontbreekt. Twee of meer verschillende kernen = vermoeden van meerdere opdrachten, met per
 * kern een groep koppen. Gratis (geen LLM); de bewuste samenvoeging van bv. een leidingadvies bij
 * dezelfde keuken blijft intact omdat die geen tweede klant-kern oplevert.
 */
export function detecteerMeerdereKlanten(koppen: KopMetIndex[]): {
  vermoeden: boolean;
  reden: string;
  groepen: KopMetIndex[][];
} {
  const kernVan = (k: KopMetIndex): string | null => naamKern(k.klant_naam) ?? k.klant_adres ?? null;
  const kernen = [...new Set(koppen.map(kernVan).filter((k): k is string => Boolean(k)))];

  if (kernen.length < 2) {
    return { vermoeden: false, reden: "", groepen: [koppen] };
  }

  const groepen = kernen.map((kern) => koppen.filter((k) => kernVan(k) === kern));
  const namen = kernen
    .map((kern) => koppen.find((k) => kernVan(k) === kern)?.klant_naam || kern)
    .join(", ");
  return {
    vermoeden: true,
    reden: `De mail bevat ${kernen.length} verschillende klanten (${namen}).`,
    groepen,
  };
}
