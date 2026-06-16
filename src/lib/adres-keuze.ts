import type { AdresKandidaat } from "./parser-schema";

export type { AdresKandidaat };

/**
 * Adres-keuze bij meerdere adressen op een order (montagelocatie vs opdrachtgever/bouwbedrijf).
 * Puur en testbaar; geen DB of netwerk. Een order-PDF kan twee adressen bevatten en de parser weet
 * niet altijd zeker welke de montagelocatie is. Bij 2+ unieke adressen moet een mens bewust kiezen,
 * zodat de monteur nooit naar het verkeerde adres rijdt.
 */

/** Normaliseert een adres voor vergelijking: lowercase, leestekens en dubbele spaties weg. */
function normaliseer(adres: string): string {
  return adres
    .toLowerCase()
    .replace(/[.,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dedupliceert kandidaten op genormaliseerd adres; het eerste voorkomen wint. Lege adressen vervallen. */
export function uniekeAdressen(kandidaten: AdresKandidaat[]): AdresKandidaat[] {
  const gezien = new Set<string>();
  const uniek: AdresKandidaat[] = [];
  for (const k of kandidaten) {
    const sleutel = normaliseer(k.adres);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uniek.push(k);
  }
  return uniek;
}

/** True als er een bewuste keuze nodig is: meer dan één uniek adres op het document. */
export function adresKeuzeNodig(kandidaten: AdresKandidaat[]): boolean {
  return uniekeAdressen(kandidaten).length > 1;
}
