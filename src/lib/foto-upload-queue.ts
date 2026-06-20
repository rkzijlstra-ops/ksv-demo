/**
 * Pure beheer-laag voor de foto-upload-wachtrij in de oplever-flow. Geen DOM, geen fetch: alleen de
 * statussen van de items en de afgeleiden (teller, "iets bezig?", eerste wachtende). Zo is de
 * voortgang-logica los testbaar en kan de component zich beperken tot de upload zelf.
 *
 * Levenscyclus van één item: wachten -> bezig -> klaar | mislukt ; mislukt -> (opnieuw) wachten.
 * Een "klaar" item heeft een url; een "mislukt" item een fout. Alle functies zijn immutable.
 */

export type UploadStatus = "wachten" | "bezig" | "klaar" | "mislukt";

export interface UploadItem {
  id: string;
  status: UploadStatus;
  /** Gezet zodra de upload klaar is (de Supabase-url). */
  url?: string;
  /** Gezet zodra de upload mislukt is (de foutmelding). */
  fout?: string;
}

/** Nieuwe wachtende items van een lijst ids. */
export function maakItems(ids: string[]): UploadItem[] {
  return ids.map((id) => ({ id, status: "wachten" }));
}

/** Voegt nieuwe wachtende items achteraan toe, bestaande blijven ongemoeid. */
export function voegToe(items: UploadItem[], ids: string[]): UploadItem[] {
  return [...items, ...maakItems(ids)];
}

/** Past één item aan (immutable); overige items blijven gelijk. */
function patch(items: UploadItem[], id: string, wijziging: Partial<UploadItem>): UploadItem[] {
  return items.map((i) => (i.id === id ? { ...i, ...wijziging } : i));
}

export function markeerBezig(items: UploadItem[], id: string): UploadItem[] {
  return patch(items, id, { status: "bezig", fout: undefined });
}

export function markeerKlaar(items: UploadItem[], id: string, url: string): UploadItem[] {
  return patch(items, id, { status: "klaar", url, fout: undefined });
}

export function markeerMislukt(items: UploadItem[], id: string, fout: string): UploadItem[] {
  return patch(items, id, { status: "mislukt", fout });
}

/** Zet een mislukt (of wachtend) item terug op wachten en wist de fout. */
export function opnieuw(items: UploadItem[], id: string): UploadItem[] {
  return patch(items, id, { status: "wachten", fout: undefined });
}

export function verwijderItem(items: UploadItem[], id: string): UploadItem[] {
  return items.filter((i) => i.id !== id);
}

export function aantalKlaar(items: UploadItem[]): number {
  return items.filter((i) => i.status === "klaar").length;
}

export function aantalTotaal(items: UploadItem[]): number {
  return items.length;
}

/** Waar zolang er nog werk loopt: een wachtend of bezig item. */
export function ietsBezig(items: UploadItem[]): boolean {
  return items.some((i) => i.status === "wachten" || i.status === "bezig");
}

export function heeftMislukte(items: UploadItem[]): boolean {
  return items.some((i) => i.status === "mislukt");
}

/** Het eerste nog te uploaden item, of undefined als er niets wacht. */
export function eersteWachtende(items: UploadItem[]): UploadItem | undefined {
  return items.find((i) => i.status === "wachten");
}

/** De urls van de klaar-items, in volgorde. */
export function klaarUrls(items: UploadItem[]): string[] {
  return items.filter((i) => i.status === "klaar" && i.url).map((i) => i.url!);
}
