import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Melding } from "./db";
import { formatDatumKort } from "./datum";

const A4 = { breedte: 595, hoogte: 842 } as const;
const MARGE = 50;
const FOTO_MAX_BREEDTE = 220;
const FOTO_MAX_HOOGTE = 165;

/**
 * Genereert het opleverrapport als PDF (bytes) uit de opdracht-kop en de monteur-meldingen.
 * Foto's worden best-effort ingesloten; een mislukte foto-fetch laat het rapport niet crashen.
 */
export async function genereerRapportPdf(
  opdracht: Melding,
  meldingen: Melding[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const zwart = rgb(0.06, 0.09, 0.16);
  const grijs = rgb(0.28, 0.33, 0.41);

  let page = doc.addPage([A4.breedte, A4.hoogte]);
  let y = A4.hoogte - MARGE;

  const ruimte = (nodig: number) => {
    if (y - nodig < MARGE) {
      page = doc.addPage([A4.breedte, A4.hoogte]);
      y = A4.hoogte - MARGE;
    }
  };

  const tekst = (
    s: string,
    opts: { size?: number; font?: PDFFont; kleur?: typeof zwart; inspring?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    ruimte(size + 5);
    page.drawText(s, {
      x: MARGE + (opts.inspring ?? 0),
      y,
      size,
      font: opts.font ?? helv,
      color: opts.kleur ?? zwart,
    });
    y -= size + 5;
  };

  // ===== Kop =====
  tekst("Opleverrapport", { size: 20, font: bold });
  tekst("Keukenstudio Voorschoten", { size: 11, kleur: grijs });
  y -= 8;
  tekst(opdracht.klant_naam ?? "Onbekende klant", { size: 14, font: bold });
  if (opdracht.klant_adres) tekst(opdracht.klant_adres, { kleur: grijs });
  if (opdracht.referentienummer) tekst(`Referentie: ${opdracht.referentienummer}`, { font: bold });
  if (opdracht.leverweek) tekst(`Leverweek: ${opdracht.leverweek}`, { kleur: grijs });
  tekst(`Opgeleverd: ${formatDatumKort(new Date().toISOString())}`, { kleur: grijs });
  y -= 10;

  // ===== Meldingen =====
  tekst(`Meldingen (${meldingen.length})`, { size: 14, font: bold });
  y -= 4;

  if (meldingen.length === 0) {
    tekst("Geen meldingen op deze opdracht.", { kleur: grijs });
  }

  for (const m of meldingen) {
    ruimte(40);
    const kop = m.spoed ? "SPOED" : "Melding";
    tekst(`${kop} — ${formatDatumKort(m.created_at)}`, { font: bold });
    if (m.spoed && m.spoed_verzonden_at) {
      tekst(`(al als spoed verstuurd op ${formatDatumKort(m.spoed_verzonden_at)})`, {
        kleur: grijs,
        inspring: 6,
      });
    }
    if (m.ruwe_tekst) {
      for (const regel of wikkel(m.ruwe_tekst, 90)) tekst(regel, { inspring: 6 });
    }
    await tekenFotos(doc, () => page, () => y, (nieuw) => (y = nieuw), ruimte, m.foto_urls);
    y -= 8;
  }

  return doc.save();
}

/** Breekt lange tekst in regels van ~max tekens (pdf-lib doet geen word-wrap). */
function wikkel(s: string, max: number): string[] {
  const woorden = s.split(/\s+/);
  const regels: string[] = [];
  let huidig = "";
  for (const w of woorden) {
    if ((huidig + " " + w).trim().length > max) {
      if (huidig) regels.push(huidig);
      huidig = w;
    } else {
      huidig = (huidig + " " + w).trim();
    }
  }
  if (huidig) regels.push(huidig);
  return regels.length ? regels : [""];
}

async function tekenFotos(
  doc: PDFDocument,
  getPage: () => PDFPage,
  getY: () => number,
  setY: (y: number) => void,
  ruimte: (nodig: number) => void,
  urls: string[],
): Promise<void> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const schaal = Math.min(
        FOTO_MAX_BREEDTE / img.width,
        FOTO_MAX_HOOGTE / img.height,
        1,
      );
      const w = img.width * schaal;
      const h = img.height * schaal;
      ruimte(h + 8);
      const y = getY() - h;
      getPage().drawImage(img, { x: MARGE + 6, y, width: w, height: h });
      setY(y - 8);
    } catch {
      // Eén kapotte/onbereikbare foto mag het rapport niet slopen.
    }
  }
}
