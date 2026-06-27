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
  PDFName,
  PDFString,
  PDFArray,
  type PDFFont,
  type PDFImage,
  type RGB,
} from "pdf-lib";
import type { Melding, Oplevering } from "./db";
import type { ControlePunt } from "./oplever-controle";
import { formatDatumKort, formatDatumLang } from "./datum";
import { rapportAfzenderWeergave, type RapportAfzender } from "./afzender";

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
    zaaknaam: opdracht.keukenzaak?.trim() || "Opdrachtgever onbekend",
    videoUrl: oplevering?.video_url ?? null,
    ondertekend: Boolean(oplevering?.handtekening_url),
    opmerking: oplevering?.opmerking?.trim() || null,
  };
}

/**
 * Label voor het aantal eindstaat-foto's. Telt bewust alléén de eindstaat-foto's uit de
 * oplever-flow, niet de meldingfoto's (die hebben een eigen telling in de meldingen-kop).
 * Pure functie, los te testen.
 */
export function eindstaatFotoLabel(aantal: number): string {
  return `${aantal} eindstaat-foto${aantal === 1 ? "" : "'s"}`;
}

/**
 * Kop voor de meldingen-sectie: het aantal meldingen, plus het aantal meldingfoto's als die er zijn.
 * Pure functie, los te testen.
 */
export function meldingenKop(aantalMeldingen: number, aantalFotos: number): string {
  const basis = `Meldingen (${aantalMeldingen})`;
  if (aantalFotos <= 0) return basis;
  return `${basis} · ${aantalFotos} foto${aantalFotos === 1 ? "" : "'s"}`;
}

// Afzender-weergave woont in een eigen module (./afzender) zodat de begeleidende e-mail hem kan
// hergebruiken zonder pdf-lib mee te trekken. Hier ge-her-exporteerd zodat bestaande imports
// vanuit "@/lib/rapport" blijven werken.
export { rapportAfzenderWeergave, type RapportAfzender };

const A4 = { breedte: 595, hoogte: 842 } as const;
const MARGE = 50;
const CONTENT = A4.breedte - MARGE * 2;

// Kleurenpalet, ontwerp "Inspectierapport": ingetogen, tabellarisch. Eén rustig accent (staalblauw),
// status met groen/rood, verder ink + grijs + haarlijnen. Bewust geen fel oranje/roodbruin.
const INK = rgb(0.11, 0.13, 0.17);
const MUTED = rgb(0.4, 0.44, 0.5);
const LINE = rgb(0.84, 0.86, 0.88);
const SURFACE = rgb(0.96, 0.97, 0.98);
const ACCENT = rgb(0.2, 0.34, 0.46);
const SUCCESS = rgb(0.16, 0.5, 0.3);
const SUCCESS_SOFT = rgb(0.93, 0.97, 0.94);
const ROOD = rgb(0.7, 0.2, 0.2);
const ROOD_SOFT = rgb(0.99, 0.95, 0.95);
const WIT = rgb(1, 1, 1);
// Interne notitie (alleen zaak-versie): amber, opvallend genoeg om niet met de openbare opmerking
// verward te worden.
const INTERN = rgb(0.6, 0.33, 0.04);
const INTERN_SOFT = rgb(1, 0.97, 0.9);

/**
 * Genereert het opleverrapport als PDF (bytes) in de "Inspectierapport"-opmaak: briefhoofd met
 * accentbalk, een gegevenstabel met de klantvelden, genummerde secties, status als nette
 * leader-regels, een controle-checklist met vinkjes en de klant-handtekening onderaan. Alle foto's
 * worden op één formaat bijgesneden (uniform raster) en zijn klikbaar (openen groot in de browser);
 * de nummering loopt door over het hele rapport. Foto's worden best-effort ingesloten; een mislukte
 * fetch toont een nette placeholder zodat het raster uitgelijnd blijft.
 */
/**
 * Voor wie het rapport bedoeld is. De klant-versie krijgt de interne notitie NOOIT in handen:
 * dat is geen vinkje maar een code-pad-eigenschap (zie de zaak-only tak hieronder).
 */
export type RapportDoelgroep = "klant" | "zaak";

/**
 * De interne notitie die in het rapport mag voor deze doelgroep. Pure functie, los te testen.
 * Borgt de kernregel: de klant-versie krijgt de interne notitie NOOIT, ongeacht wat er in de
 * oplevering staat. Geeft de getrimde tekst terug voor de zaak, anders null.
 */
export function interneNotitieVoorRapport(
  oplevering: Oplevering | null,
  bedoeldVoor: RapportDoelgroep,
): string | null {
  if (bedoeldVoor !== "zaak") return null;
  return oplevering?.interne_opmerking?.trim() || null;
}

/** Interne foto's die in het rapport mogen: alleen de zaak-versie, nooit de klant. */
export function interneFotosVoorRapport(
  oplevering: Oplevering | null,
  bedoeldVoor: RapportDoelgroep,
): string[] {
  if (bedoeldVoor !== "zaak") return [];
  return oplevering?.interne_foto_urls ?? [];
}

/** Interne video die in het rapport mag: alleen de zaak-versie, nooit de klant. */
export function interneVideoVoorRapport(
  oplevering: Oplevering | null,
  bedoeldVoor: RapportDoelgroep,
): string | null {
  if (bedoeldVoor !== "zaak") return null;
  return oplevering?.interne_video_url?.trim() || null;
}

/**
 * Variant van het rapport. "volledig" = de gewone oplevering (ongewijzigd). "verkorting" = voor
 * snel afsluiten: zelfde rapport zonder handtekening en zonder de controle-checklist.
 */
export type RapportVariant = "volledig" | "verkorting";

/** Toont het rapport de handtekening-sectie? Niet in de verkorte variant, en alleen als er een is. */
export function toonHandtekeningInRapport(
  oplevering: Oplevering | null,
  variant: RapportVariant,
): boolean {
  return variant !== "verkorting" && !!oplevering?.handtekening_url;
}

/** Toont het rapport de controle-checklist? Niet in de verkorte variant, en alleen als er punten zijn. */
export function toonControleInRapport(controle: ControlePunt[], variant: RapportVariant): boolean {
  return variant !== "verkorting" && controle.length > 0;
}

export async function genereerRapportPdf(
  opdracht: Melding,
  meldingen: Melding[],
  oplevering: Oplevering | null = null,
  afzender: RapportAfzender | null = null,
  bedoeldVoor: RapportDoelgroep = "zaak",
  variant: RapportVariant = "volledig",
): Promise<Uint8Array> {
  const samenvatting = rapportSamenvatting(opdracht, oplevering);
  const afz = rapportAfzenderWeergave(afzender);
  const doc = await PDFDocument.create();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.breedte, A4.hoogte]);
  let y = A4.hoogte - MARGE;

  // Doorlopende foto-nummering over het hele rapport (oplevering eerst, dan de meldingen).
  let fotoTeller = 0;

  const ruimte = (nodig: number) => {
    if (y - nodig < MARGE) {
      page = doc.addPage([A4.breedte, A4.hoogte]);
      y = A4.hoogte - MARGE;
    }
  };

  // ---- briefhoofd: accentbalk + bedrijfsnaam links, documentlabel + opgeleverd-datum rechts ----
  page.drawRectangle({ x: MARGE, y: y - 30, width: 4, height: 34, color: ACCENT });
  page.drawText(afz.kop, { x: MARGE + 14, y: y - 8, size: 18, font: bold, color: INK });
  page.drawText("OPLEVERRAPPORT", { x: MARGE + 14, y: y - 24, size: 9, font: bold, color: ACCENT });
  const datum = formatDatumLang(opdracht.opgeleverd_at ?? new Date().toISOString());
  rechts(datum, { size: 10, font: bold, kleur: INK, dy: -8 });
  rechts("Opgeleverd op", { size: 8, font: helv, kleur: MUTED, dy: -22 });
  y -= 48;

  // ---- klant-gegevenstabel (alleen ingevulde velden) ----
  page.drawRectangle({ x: MARGE, y: y + 4, width: CONTENT, height: 0.5, color: LINE });
  y -= 8;
  tabelRij("Klant", opdracht.klant_naam?.trim() || "Onbekende klant", true);
  if (opdracht.klant_adres?.trim()) tabelRij("Adres", opdracht.klant_adres.trim());
  if (opdracht.referentienummer?.trim()) tabelRij("Referentienummer", opdracht.referentienummer.trim());
  if (opdracht.leverweek?.trim()) tabelRij("Leverweek", opdracht.leverweek.trim());
  tabelRij("Opdrachtgever", samenvatting.zaaknaam);
  y -= 16;

  // ---- sectie 1: Oplevering ----
  const fotos = oplevering?.eindstaat_foto_urls ?? [];
  const controle = oplevering?.controle ?? [];
  const controleNietAkkoord = controle.filter((c) => !c.akkoord).length;
  const toonControle = toonControleInRapport(controle, variant);
  const toonHandtekening = toonHandtekeningInRapport(oplevering, variant);
  sectieKop(1, "Oplevering");
  // De samenvattings-regels (ondertekend / video van de oplevering / eindstaat-foto's / controle) horen
  // bij de VOLLEDIGE oplevering. Snel afsluiten (verkorting) kent geen eindstaat: daar dragen de
  // meldingen het bewijs (foto's + video per melding). Toon die regels dus niet in de verkorte variant.
  if (variant !== "verkorting") {
    leaderRegel(
      "Ondertekend door klant",
      samenvatting.ondertekend ? "Ja" : "Nee",
      samenvatting.ondertekend ? SUCCESS : MUTED,
    );
    leaderRegel(
      "Video van de oplevering",
      samenvatting.videoUrl ? "Bijgevoegd" : "Geen",
      samenvatting.videoUrl ? ACCENT : MUTED,
    );
    leaderRegel("Eindstaat-foto's", String(fotos.length), INK);
    leaderRegel("Meldingen", String(meldingen.length), INK);
    // Controle-uitkomst ook in het overzicht: detail volgt in sectie 3.
    if (toonControle) {
      leaderRegel(
        "Controle bij oplevering",
        controleNietAkkoord === 0 ? "Akkoord" : `${controleNietAkkoord} niet akkoord`,
        controleNietAkkoord === 0 ? SUCCESS : ROOD,
      );
    }
  } else {
    // Verkort (snel afsluiten): een opsomming van wat DIT rapport bevat, met alleen wat in de verkorte
    // variant kan bestaan. De meldingen dragen het bewijs; geen eindstaat/handtekening/controle.
    const meldingFotos = meldingen.reduce((n, m) => n + m.foto_urls.length, 0);
    const heeftMeldingVideo = meldingen.some((m) => !!m.video_url?.trim());
    leaderRegel("Meldingen", String(meldingen.length), INK);
    leaderRegel("Foto's", String(meldingFotos), INK);
    leaderRegel("Video", heeftMeldingVideo ? "Bijgevoegd" : "Geen", heeftMeldingVideo ? ACCENT : MUTED);
  }
  y -= 6;

  if (samenvatting.opmerking) opmerkingBlok(samenvatting.opmerking);

  // Interne blok: alleen in de ZAAK-versie. De klant-helpers leveren leeg/null, dus interne notitie
  // én media kunnen structureel niet in de klant-PDF terechtkomen (zie tests "... lekt niet").
  const intern = interneNotitieVoorRapport(oplevering, bedoeldVoor);
  if (intern) interneNotitieBlok(intern);
  const interneFotos = interneFotosVoorRapport(oplevering, bedoeldVoor);
  if (interneFotos.length > 0) {
    subKop("INTERNE FOTO'S · ALLEEN OPDRACHTGEVER");
    await fotoGrid(interneFotos);
  }
  const interneVideo = interneVideoVoorRapport(oplevering, bedoeldVoor);
  if (interneVideo) {
    y -= 4;
    videoLink("Interne video · alleen opdrachtgever", interneVideo);
  }

  // Eindstaat-foto's horen bij de volledige oplevering; in de verkorte variant niet tonen (ook niet de
  // "geen eindstaat-foto's"-regel, want het begrip bestaat daar niet).
  if (variant !== "verkorting") {
    if (fotos.length > 0) {
      subKop("EINDSTAAT-FOTO'S");
      await fotoGrid(fotos);
    } else {
      tekst("Geen eindstaat-foto's bij deze oplevering.", { size: 10, kleur: MUTED });
    }
  }
  y -= 10;

  // ---- sectie 2: Meldingen ----
  const meldingFotoAantal = meldingen.reduce((n, m) => n + m.foto_urls.length, 0);
  sectieKop(2, meldingenKop(meldingen.length, meldingFotoAantal));

  if (meldingen.length === 0) {
    tekst("Geen meldingen op deze klus.", { size: 10, kleur: MUTED });
  }

  for (const m of meldingen) {
    ruimte(40);
    const kop = m.spoed ? "Spoed" : "Melding";
    page.drawText(kop, { x: MARGE, y, size: 11, font: bold, color: m.spoed ? ROOD : INK });
    rechts(formatDatumKort(m.created_at), { size: 9, font: helv, kleur: MUTED, dy: 1 });
    y -= 16;
    if (m.spoed && m.spoed_verzonden_at) {
      tekst(`Al als spoed verstuurd op ${formatDatumKort(m.spoed_verzonden_at)}`, {
        size: 9,
        kleur: ROOD,
        gap: 5,
      });
    }
    if (m.ruwe_tekst) {
      for (const regel of wikkel(helv, 10, m.ruwe_tekst, CONTENT)) {
        tekst(regel, { size: 10, kleur: rgb(0.2, 0.23, 0.27), gap: 4 });
      }
    }
    if (m.foto_urls.length > 0) {
      y -= 4;
      await fotoGrid(m.foto_urls);
    }
    if (m.video_url) {
      y -= 6;
      videoLink("Video bij deze melding", m.video_url);
    }
    y -= 8;
    page.drawRectangle({ x: MARGE, y, width: CONTENT, height: 0.6, color: LINE });
    y -= 12;
  }

  // ---- sectie 3: Controle bij oplevering (niet in de verkorte variant) ----
  if (toonControle) {
    y -= 4;
    sectieKop(3, "Controle bij oplevering");
    for (const c of controle) controleRegel(c.punt, c.akkoord);
  }

  // ---- sectie 4: Bijlagen (foto's zijn zelf klikbaar; hier de hint + de videolink) ----
  if (fotoTeller > 0 || samenvatting.videoUrl) {
    y -= 4;
    sectieKop(toonControle ? 4 : 3, "Bijlagen");
    for (const regel of wikkel(
      helv,
      9.5,
      "Klik op een foto in het rapport om hem op groot formaat te openen, op te slaan en zelf door te sturen (bijvoorbeeld naar een leverancier)." +
        (samenvatting.videoUrl
          ? " De video opent via onderstaande link en is op dezelfde manier te bewaren."
          : ""),
      CONTENT,
    )) {
      tekst(regel, { size: 9.5, kleur: MUTED, gap: 3 });
    }
    if (samenvatting.videoUrl) {
      y -= 6;
      videoLink("Video van de oplevering", samenvatting.videoUrl);
    }
    y -= 8;
  }

  // ---- afsluiting onderaan: klant-handtekening in kader (niet in de verkorte variant) ----
  if (toonHandtekening && oplevering?.handtekening_url) {
    ruimte(96);
    subKop("HANDTEKENING KLANT");
    y -= 2;
    await tekenHandtekening(oplevering.handtekening_url);
    const ondertekenaar = [opdracht.klant_naam?.trim() || null, datum].filter(Boolean).join("  ·  ");
    tekst(ondertekenaar, { size: 8.5, kleur: MUTED, gap: 4 });
  }

  // ---- voettekst onderaan de laatste pagina (afzender-contactgegevens, indien ingevuld) ----
  if (afz.voet) {
    page.drawRectangle({ x: MARGE, y: 40, width: CONTENT, height: 0.6, color: LINE });
    const footW = helv.widthOfTextAtSize(afz.voet, 8.5);
    page.drawText(afz.voet, { x: (A4.breedte - footW) / 2, y: 28, size: 8.5, font: helv, color: MUTED });
  }

  return doc.save();

  // ===== helpers (closures over page/y/fonts) =====

  function tekst(
    s: string,
    opts: { size?: number; font?: PDFFont; kleur?: RGB; x?: number; gap?: number } = {},
  ) {
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
  }

  function rechts(s: string, o: { size: number; font: PDFFont; kleur: RGB; dy: number }) {
    const w = o.font.widthOfTextAtSize(s, o.size);
    page.drawText(s, { x: A4.breedte - MARGE - w, y: y + o.dy, size: o.size, font: o.font, color: o.kleur });
  }

  /** Eén rij in de klant-gegevenstabel: label links (grijs), waarde rechts, dunne lijn eronder. */
  function tabelRij(label: string, waarde: string, sterk = false) {
    const size = sterk ? 11 : 10;
    const font = sterk ? bold : helv;
    const regels = wikkel(font, size, waarde, CONTENT - 130);
    ruimte(regels.length * 14 + 10);
    page.drawText(label, { x: MARGE, y, size: 9.5, font: helv, color: MUTED });
    let ty = y;
    for (const regel of regels) {
      page.drawText(regel, { x: MARGE + 130, y: ty, size, font, color: INK });
      ty -= 14;
    }
    y = ty - (sterk ? 5 : 2);
    page.drawRectangle({ x: MARGE, y: y + 4, width: CONTENT, height: 0.5, color: LINE });
    y -= 6;
  }

  /** Genummerde sectiekop: accent-blokje met wit cijfer + titel, met een dikke lijn eronder. */
  function sectieKop(nr: number, titel: string) {
    ruimte(34);
    page.drawRectangle({ x: MARGE, y: y - 2, width: 16, height: 16, color: ACCENT });
    const cw = bold.widthOfTextAtSize(String(nr), 9.5);
    page.drawText(String(nr), { x: MARGE + (16 - cw) / 2, y: y + 2, size: 9.5, font: bold, color: WIT });
    page.drawText(titel.toUpperCase(), { x: MARGE + 26, y: y + 2, size: 10.5, font: bold, color: INK });
    y -= 14;
    page.drawRectangle({ x: MARGE, y, width: CONTENT, height: 1, color: INK });
    y -= 18;
  }

  /** Klein grijs subkopje (bijv. boven het fotoraster of de handtekening). */
  function subKop(label: string) {
    ruimte(18);
    page.drawText(label, { x: MARGE, y, size: 8.5, font: bold, color: MUTED });
    y -= 16;
  }

  /** Status-regel: label links, puntjes-leader, waarde rechts in de meegegeven kleur. */
  function leaderRegel(label: string, waarde: string, kleur: RGB) {
    ruimte(20);
    page.drawText(label, { x: MARGE, y, size: 10, font: helv, color: INK });
    const lw = helv.widthOfTextAtSize(label, 10);
    const ww = bold.widthOfTextAtSize(waarde, 10);
    const startx = MARGE + lw + 6;
    const endx = A4.breedte - MARGE - ww - 6;
    for (let dx = startx; dx < endx; dx += 4) page.drawCircle({ x: dx, y: y + 3, size: 0.5, color: LINE });
    page.drawText(waarde, { x: A4.breedte - MARGE - ww, y, size: 10, font: bold, color: kleur });
    y -= 18;
  }

  /** Opmerking in een zacht vlak met accent-streep links en een klein kopje. */
  function opmerkingBlok(s: string) {
    const regels = wikkel(helv, 10, s, CONTENT - 24);
    const hoogte = regels.length * 14 + 18;
    ruimte(hoogte + 6);
    const top = y;
    page.drawRectangle({
      x: MARGE,
      y: top - hoogte + 8,
      width: CONTENT,
      height: hoogte,
      color: SURFACE,
      borderColor: LINE,
      borderWidth: 0.6,
    });
    page.drawRectangle({ x: MARGE, y: top - hoogte + 8, width: 3, height: hoogte, color: ACCENT });
    let ty = top - 6;
    page.drawText("Opmerking", { x: MARGE + 12, y: ty, size: 8, font: bold, color: MUTED });
    ty -= 13;
    for (const regel of regels) {
      page.drawText(regel, { x: MARGE + 12, y: ty, size: 10, font: helv, color: rgb(0.2, 0.23, 0.27) });
      ty -= 14;
    }
    y = top - hoogte - 6;
  }

  /**
   * Interne notitie: amber blok met een expliciet "INTERN"-label. Staat alleen in de zaak-versie.
   * Bewust visueel anders dan de openbare opmerking, zodat het kantoor de twee niet verwart.
   */
  function interneNotitieBlok(s: string) {
    const regels = wikkel(helv, 10, s, CONTENT - 24);
    const hoogte = regels.length * 14 + 18;
    ruimte(hoogte + 6);
    const top = y;
    page.drawRectangle({
      x: MARGE,
      y: top - hoogte + 8,
      width: CONTENT,
      height: hoogte,
      color: INTERN_SOFT,
      borderColor: INTERN,
      borderWidth: 0.6,
    });
    page.drawRectangle({ x: MARGE, y: top - hoogte + 8, width: 3, height: hoogte, color: INTERN });
    let ty = top - 6;
    page.drawText("INTERN: alleen voor de opdrachtgever", {
      x: MARGE + 12,
      y: ty,
      size: 8,
      font: bold,
      color: INTERN,
    });
    ty -= 13;
    for (const regel of regels) {
      page.drawText(regel, { x: MARGE + 12, y: ty, size: 10, font: helv, color: rgb(0.3, 0.22, 0.05) });
      ty -= 14;
    }
    y = top - hoogte - 6;
  }

  /** Eén controlepunt: checkbox met (getekend) vinkje bij akkoord, label + de tekst eronder. */
  function controleRegel(punt: string, akkoord: boolean) {
    const kleur = akkoord ? SUCCESS : ROOD;
    ruimte(24);
    const bs = 13;
    page.drawRectangle({
      x: MARGE,
      y: y - 2,
      width: bs,
      height: bs,
      borderColor: kleur,
      borderWidth: 1.2,
      color: akkoord ? SUCCESS_SOFT : ROOD_SOFT,
    });
    if (akkoord) {
      // vinkje met twee lijnstukken (de standaardfonts coderen geen check-glyph)
      page.drawLine({ start: { x: MARGE + 2.5, y: y + 4.5 }, end: { x: MARGE + 5, y: y + 1.5 }, thickness: 1.4, color: kleur });
      page.drawLine({ start: { x: MARGE + 5, y: y + 1.5 }, end: { x: MARGE + 10.5, y: y + 8.5 }, thickness: 1.4, color: kleur });
    }
    page.drawText(akkoord ? "Akkoord" : "Niet akkoord", {
      x: MARGE + bs + 8,
      y,
      size: 10,
      font: bold,
      color: kleur,
    });
    y -= 15;
    for (const regel of wikkel(helv, 10, punt, CONTENT - (bs + 8))) {
      tekst(regel, { size: 10, x: MARGE + bs + 8, kleur: MUTED, gap: 3 });
    }
    y -= 8;
  }

  /** Fotoraster, 2 per rij, uniform bijgesneden, genummerd vlaggetje, hele tegel klikbaar. */
  async function fotoGrid(urls: string[]) {
    const cols = 2;
    const gap = 10;
    const cellW = (CONTENT - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.7;
    for (let i = 0; i < urls.length; i++) {
      const col = i % cols;
      if (col === 0) ruimte(cellH + gap);
      const top = y;
      const cx = MARGE + col * (cellW + gap);
      const nr = ++fotoTeller;
      await tekenTegel(cx, top - cellH, cellW, cellH, urls[i], nr);
      // De hele tegel is klikbaar: opent de foto op groot formaat in de browser.
      linkAnnotatie(cx, top - cellH, cellW, cellH, urls[i]);
      if (col === cols - 1 || i === urls.length - 1) y = top - cellH - gap;
    }
  }

  /** Tekent het genummerde vlaggetje linksboven in een tegel (donker blokje, witte cijfers). */
  function nummerVlag(x: number, yb: number, h: number, nr: number) {
    const bw = 22;
    const bh = 17;
    const by = yb + h - bh;
    page.drawRectangle({ x, y: by, width: bw, height: bh, color: INK });
    const s = String(nr);
    const sw = bold.widthOfTextAtSize(s, 9.5);
    page.drawText(s, { x: x + (bw - sw) / 2, y: by + (bh - 9.5) / 2 + 0.5, size: 9.5, font: bold, color: WIT });
  }

  /** Tekent één foto bijgesneden (cover) in een vaste tegel, met clipping zodat alle foto's gelijk ogen. */
  async function tekenTegel(x: number, yb: number, w: number, h: number, url: string, nr: number) {
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
      page.drawRectangle({ x, y: yb, width: w, height: h, color: SURFACE, borderColor: LINE, borderWidth: 0.6 });
      const txt = "foto niet beschikbaar";
      const tw = helv.widthOfTextAtSize(txt, 8);
      page.drawText(txt, { x: x + (w - tw) / 2, y: yb + h / 2 - 4, size: 8, font: helv, color: MUTED });
      nummerVlag(x, yb, h, nr);
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
    page.drawRectangle({ x, y: yb, width: w, height: h, borderColor: LINE, borderWidth: 0.6 });
    nummerVlag(x, yb, h, nr);
  }

  /** Voegt een klikbare URI-link toe over een rechthoek op de huidige pagina. */
  function linkAnnotatie(x: number, yb: number, w: number, h: number, url: string) {
    const annot = doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, yb, x + w, yb + h],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    const ref = doc.context.register(annot);
    let annots = page.node.lookup(PDFName.of("Annots"), PDFArray);
    if (!annots) {
      annots = doc.context.obj([]) as PDFArray;
      page.node.set(PDFName.of("Annots"), annots);
    }
    annots.push(ref);
  }

  /**
   * Klikbare video-KNOP (omlijnd, met een gekleurd play-vak links en "openen ›" rechts), zodat in de
   * PDF meteen duidelijk is dat je erop kunt klikken. De hele knop is een link-annotatie (opent de
   * video in de browser).
   */
  function videoLink(label: string, url: string) {
    const h = 22;
    const labelSize = 10;
    const openenSize = 8.5;
    const openenLabel = "openen ›";
    const playW = 20;
    const padX = 10;
    const gap = 10;
    const triH = 11;
    const triW = 9;
    const labelW = bold.widthOfTextAtSize(label, labelSize);
    const openenW = helv.widthOfTextAtSize(openenLabel, openenSize);
    const totaalW = playW + padX + labelW + gap + openenW + padX;
    ruimte(h + 8);
    const by = y - h; // onderkant van de knop
    // Witte knop met accent-rand.
    page.drawRectangle({ x: MARGE, y: by, width: totaalW, height: h, color: WIT, borderColor: ACCENT, borderWidth: 1.5 });
    // Play-vak links (accent) met witte play-driehoek, verticaal gecentreerd.
    page.drawRectangle({ x: MARGE, y: by, width: playW, height: h, color: ACCENT });
    const triX = MARGE + (playW - triW) / 2;
    const triTop = by + h / 2 + triH / 2; // anker = bovenpunt (drawSvgPath rekent y naar beneden)
    page.drawSvgPath(`M 0 0 L ${triW} ${triH / 2} L 0 ${triH} Z`, { x: triX, y: triTop, color: WIT });
    // Label (accent, vet) + "openen ›" (grijs), verticaal gecentreerd.
    page.drawText(label, { x: MARGE + playW + padX, y: by + (h - labelSize) / 2 + 1, size: labelSize, font: bold, color: ACCENT });
    page.drawText(openenLabel, {
      x: MARGE + playW + padX + labelW + gap,
      y: by + (h - openenSize) / 2 + 1,
      size: openenSize,
      font: helv,
      color: MUTED,
    });
    // De hele knop is klikbaar.
    linkAnnotatie(MARGE, by, totaalW, h, url);
    y = by - 9;
  }

  async function tekenHandtekening(url: string) {
    // Even groot als één foto-tegel (zie fotoGrid: 2 kolommen, gap 10, hoogte 0.7x de breedte).
    const gap = 10;
    const boxW = (CONTENT - gap) / 2;
    const boxH = boxW * 0.7;
    ruimte(boxH + 8);
    const top = y;
    page.drawRectangle({ x: MARGE, y: top - boxH, width: boxW, height: boxH, borderColor: LINE, borderWidth: 0.8 });
    try {
      const res = await fetch(url);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const schaal = Math.min((boxW - 20) / img.width, (boxH - 20) / img.height, 1);
        const iw = img.width * schaal;
        const ih = img.height * schaal;
        page.drawImage(img, { x: MARGE + 10, y: top - boxH + (boxH - ih) / 2, width: iw, height: ih });
        y = top - boxH - 16;
        return;
      }
    } catch {
      // val terug op tekstregel
    }
    page.drawText("(handtekening niet beschikbaar)", { x: MARGE + 10, y: top - boxH / 2 - 4, size: 9, font: helv, color: MUTED });
    y = top - boxH - 16;
  }
}

/** Breekt lange tekst in regels die binnen maxBreedte passen (pdf-lib doet geen word-wrap). */
function wikkel(font: PDFFont, size: number, s: string, maxBreedte: number): string[] {
  const woorden = s.split(/\s+/).filter(Boolean);
  const regels: string[] = [];
  let huidig = "";
  for (const w of woorden) {
    const probe = huidig ? huidig + " " + w : w;
    if (font.widthOfTextAtSize(probe, size) > maxBreedte && huidig) {
      regels.push(huidig);
      huidig = w;
    } else {
      huidig = probe;
    }
  }
  if (huidig) regels.push(huidig);
  return regels.length ? regels : [""];
}
