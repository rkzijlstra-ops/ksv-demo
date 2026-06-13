/**
 * Onderwerp en tekst van de annuleer-mail naar de monteur: zijn toegewezen opdracht is geannuleerd.
 * Pure functie, los te testen. Afsluiter = de keukenzaak (consistent met de andere app-mails).
 */
export function annuleringTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Klus geannuleerd: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${monteurNaam},

De klus voor ${klantNaam}${ref} is geannuleerd. Je hoeft er niets meer mee te doen; hij staat niet meer in je werkpool.

${afzender}`;
  return { subject, text };
}
