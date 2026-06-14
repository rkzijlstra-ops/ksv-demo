/**
 * Samenvoegen van een geparste order (PDF/foto) met wat al in het invoerblok staat. Regel: aanvullen
 * waar leeg, met rust laten waar het klopt, en bij verschil NOOIT stil overschrijven maar een botsing
 * teruggeven zodat de gebruiker kiest. De werkomschrijving zit hier bewust niet in (nooit overschrijven).
 * Puur en testbaar.
 */

export interface OrderVelden {
  klant_naam?: string | null;
  klant_adres?: string | null;
  referentienummer?: string | null;
  adviseur?: string | null;
  klant_telefoon?: string | null;
  klant_email?: string | null;
  leverweek?: string | null;
  keukenzaak?: string | null;
}

export type SamenvoegVeld = keyof OrderVelden;

export interface Botsing {
  veld: SamenvoegVeld;
  bestaand: string;
  nieuw: string;
}

export interface SamenvoegResultaat {
  velden: OrderVelden;
  botsingen: Botsing[];
}

const SAMENVOEG_VELDEN: SamenvoegVeld[] = [
  "klant_naam",
  "klant_adres",
  "referentienummer",
  "adviseur",
  "klant_telefoon",
  "klant_email",
  "leverweek",
  "keukenzaak",
];

function leeg(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

function gelijk(a: unknown, b: unknown): boolean {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function voegSamen(bestaand: OrderVelden, geparset: OrderVelden): SamenvoegResultaat {
  const velden: OrderVelden = {};
  // alleen de bekende samenvoeg-velden meenemen (werkomschrijving e.d. blijven buiten)
  for (const veld of SAMENVOEG_VELDEN) {
    if (bestaand[veld] !== undefined) velden[veld] = bestaand[veld];
  }
  const botsingen: Botsing[] = [];

  for (const veld of SAMENVOEG_VELDEN) {
    const b = bestaand[veld];
    const n = geparset[veld];
    if (leeg(n)) continue; // niets nieuws te halen
    if (leeg(b)) {
      velden[veld] = n ?? null; // vul lege
      continue;
    }
    if (gelijk(b, n)) continue; // klopt al, met rust laten
    botsingen.push({ veld, bestaand: String(b), nieuw: String(n) }); // bestaand blijft, gebruiker kiest
  }

  return { velden, botsingen };
}

/** Voegt meldingen samen: aanvullen, niet vervangen. */
export function voegMeldingenSamen<T>(bestaand: T[], nieuw: T[]): T[] {
  return [...(bestaand ?? []), ...(nieuw ?? [])];
}

/** True als een bijgevoegde order een ander (niet-leeg) referentienummer heeft dan de klus. */
export function andereReferentie(klusRef?: string | null, nieuweRef?: string | null): boolean {
  if (leeg(klusRef) || leeg(nieuweRef)) return false;
  return !gelijk(klusRef, nieuweRef);
}
