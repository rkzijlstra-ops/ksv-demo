/**
 * Onderwerp en tekst van de mail naar de monteur van wie een al verstuurde opdracht is weggehaald
 * doordat hij naar een andere monteur is geschoven. Bewust neutraal: de monteur hoeft niet te weten
 * wie hem overneemt, alleen dat de klus niet meer van hem is. Geen "geannuleerd" (de klus bestaat nog)
 * en geen "mogelijk later opnieuw" (anders dan ontplannen naar de pool). Pure functie, los te testen.
 */
export function overgenomenTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Opdracht niet meer voor jou: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${monteurNaam},

De opdracht voor ${klantNaam}${ref} is niet meer aan jou toegewezen en staat niet meer in je werkpool. Je hoeft er niets mee te doen.

${afzender}`;
  return { subject, text };
}
