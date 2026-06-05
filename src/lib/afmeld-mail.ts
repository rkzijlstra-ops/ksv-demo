/**
 * Onderwerp en tekst van de afmeld-mail: de gebruiker is uit de planning-app verwijderd.
 * Pure functie, los te testen. Afsluiter = de keukenzaak (consistent met de uitnodig-mail).
 */
export function afmeldingTekst(
  naam: string,
  organisatie = "",
): { subject: string; text: string } {
  const subject = "Je bent afgemeld bij de planning-app";
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${naam},

Je bent afgemeld bij de planning-app. Je hebt vanaf nu geen toegang meer.

Klopt dit niet, of denk je dat het een vergissing is, neem dan even contact op.

${afzender}`;
  return { subject, text };
}
