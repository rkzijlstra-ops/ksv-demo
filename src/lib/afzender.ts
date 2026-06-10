/** Afzender-gegevens van de monteur die opleverde (uit zijn profiel). */
export interface RapportAfzender {
  naam: string | null;
  bedrijfsnaam: string | null;
  telefoon: string | null;
  email: string | null;
}

/**
 * Bepaalt hoe de afzender getoond wordt: de kop is de bedrijfsnaam, anders de naam, anders een
 * neutrale terugval (nooit meer hardcoded BKM bij een andere monteur). De voetregel bundelt de
 * aanwezige contactvelden. Pure functie, los te testen. Wordt zowel door het PDF-rapport als door
 * de begeleidende e-mail gebruikt, zodat afzender-kop en ondertekening altijd gelijk lopen.
 */
export function rapportAfzenderWeergave(a: RapportAfzender | null): { kop: string; voet: string } {
  const bedrijf = a?.bedrijfsnaam?.trim() || null;
  const naam = a?.naam?.trim() || null;
  const kop = bedrijf || naam || "Keukenmontage";
  const voetDelen = [bedrijf || naam, a?.telefoon?.trim() || null, a?.email?.trim() || null].filter(Boolean);
  return { kop, voet: voetDelen.join("  ·  ") };
}
