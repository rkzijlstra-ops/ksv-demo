/**
 * Gedeelde, pdf-lib-vrije helpers voor de rapport-indeling. Bewust zonder imports uit rapport.ts
 * (die trekt pdf-lib mee) zodat zowel de PDF-generator, de in-app RapportWeergave als de publieke
 * foto-downloadpagina deze pure functies kunnen gebruiken en ze los te testen zijn.
 */

export type MeldingBalkStatus = "geen" | "gewoon" | "spoed";

export interface MeldingBalk {
  aantal: number;
  /** Aantal spoedmeldingen. */
  spoed: number;
  /** Kleur-staat: geen (groen), gewoon (oranje), spoed (rood). */
  status: MeldingBalkStatus;
  tekst: string;
}

/**
 * Bepaalt de meldingen-balk bovenaan het rapport: aantal, aantal spoed, kleur-staat en tekst.
 * Rood zodra er minstens één spoedmelding is, oranje bij gewone meldingen, groen bij geen.
 */
export function meldingenBalk(meldingen: { spoed: boolean }[]): MeldingBalk {
  const aantal = meldingen.length;
  const spoed = meldingen.filter((m) => m.spoed).length;
  const status: MeldingBalkStatus = aantal === 0 ? "geen" : spoed > 0 ? "spoed" : "gewoon";
  let tekst: string;
  if (aantal === 0) {
    tekst = "Geen meldingen op deze klus";
  } else {
    const basis = `${aantal} melding${aantal === 1 ? "" : "en"} op deze klus`;
    tekst = spoed > 0 ? `${basis} · waarvan ${spoed} spoed` : basis;
  }
  return { aantal, spoed, status, tekst };
}

/** Eén foto in de doorlopende rapport-nummering. */
export interface FotoItem {
  url: string;
  /** Doorlopend nummer in het rapport (1-based), meldingen eerst, dan eindstaat. */
  nr: number;
  /** 0-based positie in de platte fotolijst; sleutel voor de zip-route-selectie. */
  index: number;
}

export interface MeldingFotoGroep {
  soort: "melding";
  meldingId: string;
  spoed: boolean;
  tekst: string | null;
  datum: string;
  fotos: FotoItem[];
}

export interface EindstaatFotoGroep {
  soort: "eindstaat";
  fotos: FotoItem[];
}

export type FotoGroep = MeldingFotoGroep | EindstaatFotoGroep;

/** Minimale melding-vorm die de foto-indeling nodig heeft. */
export interface MeldingVoorFotos {
  id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  created_at: string;
  foto_urls: string[];
}

/**
 * Groepeert de foto's voor de downloadpagina in de rapport-volgorde: eerst de meldingen (met tekst),
 * daarna de eindstaat. Alleen groepen met foto's komen terug. De nummering (`nr`) loopt door over alle
 * foto's en volgt exact de rapport-volgorde; `index` is de stabiele 0-based sleutel voor de zip-selectie.
 */
export function fotoGroepen(meldingen: MeldingVoorFotos[], eindstaatFotos: string[]): FotoGroep[] {
  let teller = 0;
  const groepen: FotoGroep[] = [];
  for (const m of meldingen) {
    if (m.foto_urls.length === 0) continue;
    const fotos = m.foto_urls.map((url) => ({ url, nr: ++teller, index: teller - 1 }));
    groepen.push({
      soort: "melding",
      meldingId: m.id,
      spoed: m.spoed,
      tekst: m.ruwe_tekst,
      datum: m.created_at,
      fotos,
    });
  }
  if (eindstaatFotos.length > 0) {
    const fotos = eindstaatFotos.map((url) => ({ url, nr: ++teller, index: teller - 1 }));
    groepen.push({ soort: "eindstaat", fotos });
  }
  return groepen;
}

/** Platte fotolijst in rapport-volgorde; `alle[i].index === i`. Basis voor de zip-route. */
export function platteFotoLijst(meldingen: MeldingVoorFotos[], eindstaatFotos: string[]): FotoItem[] {
  return fotoGroepen(meldingen, eindstaatFotos).flatMap((g) => g.fotos);
}

/** Leidt de bestandsextensie af uit een foto-URL (querystring/anker weg); valt terug op jpg. */
export function extVanUrl(url: string): string {
  const schoon = url.split("?")[0].split("#")[0];
  const m = schoon.match(/\.([a-zA-Z0-9]{1,5})$/);
  return m ? m[1].toLowerCase() : "jpg";
}

/** Eén downloadbare foto met een sprekende bestandsnaam voor in de zip. */
export interface FotoDownloadEntry {
  /** Stabiele 0-based sleutel (positie in de platte lijst), gebruikt in de zip-selectie. */
  index: number;
  url: string;
  naam: string;
}

/**
 * Bouwt de downloadlijst met sprekende bestandsnamen: `melding-1-foto-1.jpg`, `eindstaat-foto-5.jpg`,
 * enzovoort. Zelfde volgorde/nummering als het rapport, zodat de opdrachtgever de foto's herkent.
 */
export function fotoDownloadEntries(
  meldingen: MeldingVoorFotos[],
  eindstaatFotos: string[],
): FotoDownloadEntry[] {
  const entries: FotoDownloadEntry[] = [];
  let meldingNr = 0;
  for (const g of fotoGroepen(meldingen, eindstaatFotos)) {
    if (g.soort === "melding") {
      meldingNr++;
      for (const f of g.fotos) {
        entries.push({ index: f.index, url: f.url, naam: `melding-${meldingNr}-foto-${f.nr}.${extVanUrl(f.url)}` });
      }
    } else {
      for (const f of g.fotos) {
        entries.push({ index: f.index, url: f.url, naam: `eindstaat-foto-${f.nr}.${extVanUrl(f.url)}` });
      }
    }
  }
  return entries;
}
