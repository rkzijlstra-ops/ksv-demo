import type { ParsedPdf } from "./parser-schema";

/** Cijferkern van een referentie, zodat '166' en 'SP166' samenvallen. Geen cijfers/leeg → null. */
export function refKern(ref: string | null | undefined): string | null {
  const cijfers = (ref ?? "").replace(/\D/g, "");
  return cijfers.length > 0 ? cijfers : null;
}

const TITELS = /\b(mevrouw|mevr|mw|de heer|dhr|heer|hr|familie|fam)\b/gi;
// Nederlandse tussenvoegsels: laat alleen de achternaam-kern over, zodat "T van Bavel" en
// "De familie T van Bavel" dezelfde kern krijgen.
const PARTIKELS = new Set([
  "van", "de", "der", "den", "het", "te", "ten", "ter", "op", "aan", "in", "'t", "vande", "vander",
]);

/** Normaliseert een klantnaam tot een vergelijk-kern (titels, initialen en tussenvoegsels eruit). */
export function naamKern(naam: string | null | undefined): string | null {
  if (!naam) return null;
  let s = naam.toLowerCase().replace(TITELS, " ");
  s = s.replace(/\b[a-z]\.?\b/g, " "); // losse initialen (één letter)
  const woorden = s.split(/[^a-z']+/).filter((w) => w.length > 0 && !PARTIKELS.has(w));
  const kern = woorden.join("");
  return kern.length >= 3 ? kern : null;
}

/** Referentie-achtige getallen (2-6 cijfers) uit een bestandsnaam, bv. 'Comm Bavel 172.pdf' → ['172']. */
export function bestandsnaamRefs(bestandsnaam: string | null | undefined): string[] {
  const matches = (bestandsnaam ?? "").match(/\d{2,6}/g) ?? [];
  return [...new Set(matches)];
}

/** Eerste niet-lege (niet-null/undefined, geen lege/witruimte-string) waarde uit een reeks. */
export function eersteNietLeeg<T>(...waarden: (T | null | undefined)[]): T | null {
  for (const w of waarden) {
    if (w === null || w === undefined) continue;
    if (typeof w === "string" && w.trim() === "") continue;
    return w;
  }
  return null;
}

export interface DocVoorGroep {
  index: number;
  referentienummer: string | null;
  klant_naam: string | null;
  /** Bestandsnaam; het referentie-getal erin (bv. 'Comm Bavel 172') brugt documenten ook als de
   *  inhoud verkeerd is gelezen. */
  bestandsnaam?: string;
}

/**
 * Groepeert documenten die bij dezelfde klus horen. Twee documenten horen samen als ze dezelfde
 * referentie-kern OF dezelfde naam-kern delen (union-find), zodat een orderbon (ref 166), een
 * leidingschema (ref SP166) en een naamloze-maar-zelfde-klant tekening in één groep belanden.
 * Documenten zonder referentie én zonder naam komen in `ongegroepeerd` (de mens wijst die toe).
 */
export function groepeerDocumenten(docs: DocVoorGroep[]): {
  groepen: number[][];
  ongegroepeerd: number[];
} {
  const ongegroepeerd: number[] = [];
  const metKernels = new Map<number, string[]>();
  for (const d of docs) {
    const kernels: string[] = [];
    const r = refKern(d.referentienummer);
    if (r) kernels.push("r:" + r);
    // Referentie-getallen uit de bestandsnaam tellen als dezelfde soort kern (vangnet bij fout parsen).
    for (const fr of bestandsnaamRefs(d.bestandsnaam)) kernels.push("r:" + fr);
    const n = naamKern(d.klant_naam);
    if (n) kernels.push("n:" + n);
    if (kernels.length === 0) ongegroepeerd.push(d.index);
    else metKernels.set(d.index, kernels);
  }

  const parent = new Map<number, number>();
  for (const i of metKernels.keys()) parent.set(i, i);
  const find = (x: number): number => {
    let r = x;
    while (parent.get(r)! !== r) r = parent.get(r)!;
    while (parent.get(x)! !== r) {
      const nx = parent.get(x)!;
      parent.set(x, r);
      x = nx;
    }
    return r;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const kernelNaarIndex = new Map<string, number>();
  for (const [idx, kernels] of metKernels) {
    for (const k of kernels) {
      const eerste = kernelNaarIndex.get(k);
      if (eerste === undefined) kernelNaarIndex.set(k, idx);
      else union(idx, eerste);
    }
  }

  const rootNaarGroep = new Map<number, number[]>();
  const volgorde: number[] = [];
  for (const idx of metKernels.keys()) {
    const root = find(idx);
    if (!rootNaarGroep.has(root)) {
      rootNaarGroep.set(root, []);
      volgorde.push(root);
    }
    rootNaarGroep.get(root)!.push(idx);
  }
  return { groepen: volgorde.map((r) => rootNaarGroep.get(r)!), ongegroepeerd };
}

/**
 * Voegt de gevonden velden van meerdere documenten in één klus samen (eerste niet-lege per veld). De
 * orderbevestiging is leidend: die wordt eerst meegewogen, zodat zijn referentie en telefoon winnen van
 * een tekening of leidingschema met een afwijkend formaat.
 */
export function voegOrderSamen(lijst: ParsedPdf[]): ParsedPdf {
  const rang = (p: ParsedPdf) =>
    p.documenttype === "orderbevestiging" ? 0 : p.documenttype === "werkbon_service" ? 1 : 2;
  const op = [...lijst].sort((a, b) => rang(a) - rang(b));
  const documenttype =
    op.find((p) => p.documenttype === "orderbevestiging")?.documenttype ??
    op.find((p) => p.documenttype === "werkbon_service")?.documenttype ??
    "onbekend";
  return {
    klant_naam: eersteNietLeeg(...op.map((p) => p.klant_naam)),
    klant_adres: eersteNietLeeg(...op.map((p) => p.klant_adres)),
    referentienummer: eersteNietLeeg(...op.map((p) => p.referentienummer)),
    adviseur: eersteNietLeeg(...op.map((p) => p.adviseur)),
    klant_telefoon: eersteNietLeeg(...op.map((p) => p.klant_telefoon)),
    klant_email: eersteNietLeeg(...op.map((p) => p.klant_email)),
    documenttype,
    leverweek: eersteNietLeeg(...op.map((p) => p.leverweek)),
    keukenzaak: eersteNietLeeg(...op.map((p) => p.keukenzaak)),
    meldingen: op.flatMap((p) => p.meldingen),
    adressen: op.flatMap((p) => p.adressen),
  };
}
