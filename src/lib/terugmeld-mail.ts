/** Vaste redenen voor een terugmelding (ook gebruikt in de UI en het logboek). */
export const TERUGMELD_REDENEN: { waarde: string; label: string }[] = [
  { waarde: "klant_niet_thuis", label: "Klant niet thuis" },
  { waarde: "werk_niet_afgerond", label: "Werk niet af te ronden" },
  { waarde: "anders", label: "Anders" },
];

export function redenLabel(waarde: string): string {
  return TERUGMELD_REDENEN.find((r) => r.waarde === waarde)?.label ?? waarde;
}

/**
 * Onderwerp en tekst van de terugmeld-mail naar kantoor: de monteur kreeg een klus niet rond en meldt
 * hem terug. Pure functie, los te testen. Afsluiter = de keukenzaak (consistent met de andere mails).
 */
export function terugmeldingTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  reden: string,
  toelichting: string | null,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Teruggemeld door de monteur: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const toel = toelichting?.trim() ? `\n\nToelichting van de monteur:\n${toelichting.trim()}` : "";
  const text = `Hoi,

${monteurNaam} heeft de klus voor ${klantNaam}${ref} teruggemeld aan kantoor; hij is niet doorgegaan.

Reden: ${redenLabel(reden)}${toel}

De klus staat niet meer in de kluspool van de monteur. Bekijk hem op het dashboard om opnieuw in te plannen, de klant te bellen of de klus af te sluiten.

${afzender}`;
  return { subject, text };
}
