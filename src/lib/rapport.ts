import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
  type PDFFont,
  type PDFPage,
  type PDFImage,
  type RGB,
} from "pdf-lib";
import type { Melding, Oplevering } from "./db";
import { formatDatumKort } from "./datum";

export interface RapportSamenvatting {
  zaaknaam: string;
  videoUrl: string | null;
  ondertekend: boolean;
  opmerking: string | null;
}

/**
 * Leidt de oplever-kop-gegevens af voor het rapport. Pure functie (geen IO), los te testen.
 * Zaaknaam komt van de opdracht (niet hardcoded); video/handtekening/opmerking van de oplevering.
 * De eindstaat-keuze is geschrapt, dus geen uitkomst-label meer.
 */
export function rapportSamenvatting(
  opdracht: Melding,
  oplevering: Oplevering | null,
): RapportSamenvatting {
  return {
    zaaknaam: opdracht.keukenzaak?.trim() || "Keukenzaak onbekend",
    videoUrl: oplevering?.video_url ?? null,
    ondertekend: Boolean(oplevering?.handtekening_url),
    opmerking: oplevering?.opmerking?.trim() || null,
  };
}

const A4 = { breedte: 595, hoogte: 842 } as const;
const MARGE = 48;
const CONTENT = A4.breedte - MARGE * 2;

// Kleurenpalet, afgeleid van de app (ontwerp "Document").
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.28, 0.33, 0.41);
const LINE = rgb(0.79, 0.84, 0.88);
const SURFACE = rgb(0.945, 0.96, 0.976);
const ACCENT = rgb(0.976, 0.451, 0.086);
const ACCENT_INK = rgb(0.76, 0.25, 0.05);
const ACCENT_SOFT = rgb(1, 0.957, 0.922);
const SUCCESS = rgb(0.086, 0.64, 0.29);
const SUCCESS_SOFT = rgb(0.925, 0.992, 0.96);
const ROOD = rgb(0.86, 0.15, 0.15);

/**
 * Genereert het opleverrapport als PDF (bytes) in de "Document"-opmaak: briefhoofd met
 * accentlijn, duidelijk gescheiden secties (oplevering vs meldingen) en een uniforme foto-grid
 * (alle foto's bijgesneden op één formaat, ongeacht of ze in de app of via de galerij gemaakt zijn).
 * Foto's worden best-effort ingesloten; een mislukte fetch toont een nette placeholder.
 */
export async function genereerRapportPdf(
  opdracht: Melding,
  meldingen: Melding[],
  oplevering: Oplevering | null = null,
): Promise<Uint8Array> {
  const samenvatting = rapportSamenvatting(opdracht, oplevering);
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

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
    opts: { size?: number; font?: PDFFont; kleur?: RGB; x?: number; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    ruimte(size + (opts.gap ?? 5));
    page.drawText(s, {
      x: opts.x ?? MARGE,
      y,
      size,
      font: opts.font ?? helv,
      color: opts.kleur ?? INK,
    });
    y -= size + (opts.gap ?? 5);
  };

  // ---- briefhoofd ----
  page.drawText("BKM", { x: MARGE, y: y - 4, size: 22, font: bold, color: INK });
  const bkmW = bold.widthOfTextAtSize("BKM", 22);
  page.drawText("KEUKENMONTAGE", {
    x: MARGE + bkmW + 6,
    y: y - 1,
    size: 8,
    font: bold,
    color: MUTED,
  });
  rechts("OPLEVERRAPPORT", { size: 11, font: bold, kleur: INK, dy: -2 });
  rechts(formatDatumKort(opdracht.opgeleverd_at ?? new Date().toISOString()), {
    size: 9.5,
    font: helv,
    kleur: MUTED,
    dy: -14,
  });
  y -= 26;
  // accentlijn
  page.drawRectangle({ x: MARGE, y, width: CONTENT, height: 3, color: ACCENT });
  y -= 18;

  // ---- klantblok ----
  tekst(opdracht.klant_naam ?? "Onbekende klant", { size: 18, font: bold, gap: 3 });
  if (opdracht.klant_adres) tekst(opdracht.klant_adres, { size: 11, kleur: MUTED, gap: 8 });

  const chips: string[] = [];
  if (opdracht.referentienummer) chips.push(`Ref ${opdracht.referentienummer}`);
  if (opdracht.leverweek) chips.push(`Leverweek ${opdracht.leverweek}`);
  chips.push(samenvatting.zaaknaam);
  tekenChips(chips);
  y -= 6;

  // ---- sectie: Oplevering / rapportage ----
  sectieKop("Oplevering / rapportage", ACCENT);

  const fotos = oplevering?.eindstaat_foto_urls ?? [];
  tekenBadges([
    samenvatting.ondertekend
      ? { label: "Ondertekend door klant", bg: SUCCESS_SOFT, rand: SUCCESS, ink: SUCCESS }
      : { label: "Niet ondertekend", bg: SURFACE, rand: LINE, ink: MUTED },
    samenvatting.videoUrl
      ? { label: "Video bijgevoegd", bg: ACCENT_SOFT, rand: ACCENT, ink: ACCENT_INK }
      : { label: "Geen video", bg: SURFACE, rand: LINE, ink: MUTED },
    { label: `${fotos.length} foto${fotos.length === 1 ? "" : "'s"}`, bg: ACCENT_SOFT, rand: ACCENT, ink: ACCENT_INK },
  ]);

  if (samenvatting.opmerking) {
    opmerkingBlok(samenvatting.opmerking);
  }

  if (samenvatting.videoUrl) {
    tekst("Video van de oplevering:", { size: 10, font: bold, gap: 3 });
    for (const regel of wikkel(samenvatting.videoUrl, 95))
      tekst(regel, { size: 9, kleur: MUTED, x: MARGE + 4, gap: 3 });
    y -= 6;
  }

  if (fotos.length > 0) {
    await fotoGrid(fotos, 2);
  } else {
    tekst("Geen eindstaat-foto's bij deze oplevering.", { size: 10, kleur: MUTED });
  }

  if (oplevering?.handtekening_url) {
    y -= 4;
    tekst("Handtekening klant:", { size: 10, font: bold, gap: 4 });
    await tekenHandtekening(oplevering.handtekening_url);
  }
  y -= 8;

  // ---- sectie: Meldingen ----
  sectieKop(`Meldingen (${meldingen.length})`, INK);

  if (meldingen.length === 0) {
    tekst("Geen meldingen op deze opdracht.", { size: 10, kleur: MUTED });
  }

  for (const m of meldingen) {
    ruimte(46);
    const kop = m.spoed ? "Spoed" : "Melding";
    page.drawText(kop, { x: MARGE, y, size: 11, font: bold, color: m.spoed ? ROOD : INK });
    rechts(formatDatumKort(m.created_at), { size: 9, font: helv, kleur: MUTED, dy: 1 });
    y -= 16;
    if (m.spoed && m.spoed_verzonden_at) {
      tekst(`Al als spoed verstuurd op ${formatDatumKort(m.spoed_verzonden_at)}`, {
        size: 9,
        kleur: ROOD,
        x: MARGE + 4,
        gap: 4,
      });
    }
    if (m.ruwe_tekst) {
      for (const regel of wikkel(m.ruwe_tekst, 92)) tekst(regel, { size: 10.5, x: MARGE + 4, gap: 4 });
    }
    if (m.foto_urls.length > 0) {
      y -= 2;
      await fotoGrid(m.foto_urls, 3);
    }
    y -= 6;
    page.drawRectangle({ x: MARGE, y, width: CONTENT, height: 0.7, color: LINE });
    y -= 12;
  }

  // ---- voettekst onderaan de laatste pagina ----
  const foot = "BKM Keukenmontage  ·  06-31665814  ·  bkmkeukenmontage@gmail.com";
  const footW = helv.widthOfTextAtSize(foot, 8.5);
  page.drawText(foot, { x: (A4.breedte - footW) / 2, y: 30, size: 8.5, font: helv, color: MUTED });

  return doc.save();

  // ===== helpers (closures over page/y/fonts) =====

  function rechts(s: string, o: { size: number; font: PDFFont; kleur: RGB; dy: number }) {
    const w = o.font.widthOfTextAtSize(s, o.size);
    page.drawText(s, { x: A4.breedte - MARGE - w, y: y + o.dy, size: o.size, font: o.font, color: o.kleur });
  }

  function sectieKop(label: string, kleur: RGB) {
    ruimte(30);
    page.drawRectangle({ x: MARGE, y: y - 1, width: 10, height: 10, color: kleur });
    page.drawText(label.toUpperCase(), { x: MARGE + 18, y, size: 11, font: bold, color: INK });
    y -= 14;
    page.drawRectangle({ x: MARGE, y, width: CONTENT, height: 1, color: LINE });
    y -= 14;
  }

  function tekenChips(labels: string[]) {
    ruimte(22);
    let x = MARGE;
    const size = 8.5;
    const padX = 6;
    const h = 16;
    for (const label of labels) {
      const w = helv.widthOfTextAtSize(label, size) + padX * 2;
      if (x + w > MARGE + CONTENT) {
        y -= h + 5;
        ruimte(22);
        x = MARGE;
      }
      page.drawRectangle({ x, y: y - 3, width: w, height: h, color: SURFACE, borderColor: LINE, borderWidth: 0.7 });
      page.drawText(label, { x: x + padX, y: y + 1, size, font: bold, color: INK });
      x += w + 5;
    }
    y -= h + 2;
  }

  function tekenBadges(badges: { label: string; bg: RGB; rand: RGB; ink: RGB }[]) {
    ruimte(24);
    let x = MARGE;
    const size = 8.5;
    const padX = 7;
    const h = 17;
    for (const b of badges) {
      const w = bold.widthOfTextAtSize(b.label, size) + padX * 2;
      if (x + w > MARGE + CONTENT) {
        y -= h + 5;
        ruimte(24);
        x = MARGE;
      }
      page.drawRectangle({ x, y: y - 4, width: w, height: h, color: b.bg, borderColor: b.rand, borderWidth: 0.8 });
      page.drawText(b.label, { x: x + padX, y: y, size, font: bold, color: b.ink });
      x += w + 5;
    }
    y -= h + 4;
  }

  function opmerkingBlok(s: string) {
    const regels = wikkel(s, 88);
    const lineH = 14;
    const padX = 12;
    const padY = 10;
    const hoogte = regels.length * lineH + padY * 2 - (lineH - 11);
    ruimte(hoogte + 6);
    const top = y;
    page.drawRectangle({
      x: MARGE,
      y: top - hoogte,
      width: CONTENT,
      height: hoogte,
      color: SURFACE,
      borderColor: LINE,
      borderWidth: 0.7,
    });
    // accent-streep links
    page.drawRectangle({ x: MARGE, y: top - hoogte, width: 3, height: hoogte, color: ACCENT });
    let ty = top - padY - 9;
    for (const regel of regels) {
      page.drawText(regel, { x: MARGE + padX, y: ty, size: 11, font: helv, color: rgb(0.2, 0.25, 0.33) });
      ty -= lineH;
    }
    y = top - hoogte - 12;
  }

  async function fotoGrid(urls: string[], cols: number) {
    const gap = 8;
    const cellW = (CONTENT - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.72;
    for (let i = 0; i < urls.length; i++) {
      const col = i % cols;
      if (col === 0) ruimte(cellH + gap);
      const top = y;
      const cx = MARGE + col * (cellW + gap);
      await tekenTegel(cx, top - cellH, cellW, cellH, urls[i]);
      if (col === cols - 1 || i === urls.length - 1) y = top - cellH - gap;
    }
  }

  /** Tekent één foto bijgesneden (cover) in een vaste tegel, met clipping zodat alle foto's gelijk ogen. */
  async function tekenTegel(x: number, yb: number, w: number, h: number, url: string) {
    let img: PDFImage | null = null;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      }
    } catch {
      img = null;
    }
    if (!img) {
      // nette placeholder zodat het raster uitgelijnd blijft
      page.drawRectangle({ x, y: yb, width: w, height: h, color: SURFACE, borderColor: LINE, borderWidth: 0.7 });
      const txt = "foto niet beschikbaar";
      const tw = helv.widthOfTextAtSize(txt, 8);
      page.drawText(txt, { x: x + (w - tw) / 2, y: yb + h / 2 - 4, size: 8, font: helv, color: MUTED });
      return;
    }
    const schaal = Math.max(w / img.width, h / img.height); // cover
    const iw = img.width * schaal;
    const ih = img.height * schaal;
    const ix = x - (iw - w) / 2;
    const iy = yb - (ih - h) / 2;
    page.pushOperators(
      pushGraphicsState(),
      moveTo(x, yb),
      lineTo(x + w, yb),
      lineTo(x + w, yb + h),
      lineTo(x, yb + h),
      closePath(),
      clip(),
      endPath(),
    );
    page.drawImage(img, { x: ix, y: iy, width: iw, height: ih });
    page.pushOperators(popGraphicsState());
    page.drawRectangle({ x, y: yb, width: w, height: h, borderColor: LINE, borderWidth: 0.7 });
  }

  async function tekenHandtekening(url: string) {
    const w = 150;
    const h = 60;
    ruimte(h + 8);
    const top = y;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const schaal = Math.min(w / img.width, h / img.height, 1);
        page.drawImage(img, { x: MARGE + 6, y: top - img.height * schaal, width: img.width * schaal, height: img.height * schaal });
        page.drawRectangle({ x: MARGE, y: top - h, width: w + 12, height: h, borderColor: LINE, borderWidth: 0.7 });
        y = top - h - 4;
        return;
      }
    } catch {
      // val terug op tekstregel
    }
    tekst("(handtekening niet beschikbaar)", { size: 9, kleur: MUTED });
  }
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
