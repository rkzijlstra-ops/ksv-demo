/**
 * Onderwerp en tekst van de ontplan-mail naar de monteur: zijn toegewezen opdracht is van de
 * planning gehaald (terug naar de pool). Anders dan bij annuleren is dit niet definitief; de klus
 * kan later opnieuw ingepland worden. Pure functie, los te testen. Afsluiter = de keukenzaak.
 */
export function ontplanningTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Klus van je planning gehaald: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${monteurNaam},

De geplande klus voor ${klantNaam}${ref} is van je planning gehaald en staat niet meer in je kluspool. Mogelijk plannen we hem later opnieuw in; je krijgt dan vanzelf weer bericht.

${afzender}`;
  return { subject, text };
}
