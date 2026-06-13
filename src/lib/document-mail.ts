/**
 * Onderwerp en tekst van de mail naar de monteur als er een nieuw document is toegevoegd aan een al
 * verstuurde opdracht. Bewust geen herbevestiging: datum en plek veranderen niet. Pure functie, los te
 * testen. Afsluiter = de keukenzaak (consistent met de andere app-mails).
 */
export function nieuwDocumentTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Nieuw document bij je klus: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${monteurNaam},

Er is een nieuw document toegevoegd aan de klus voor ${klantNaam}${ref}. Je vindt het in de app bij de klus. De afspraak blijft ongewijzigd; je hoeft niets opnieuw te bevestigen.

${afzender}`;
  return { subject, text };
}
