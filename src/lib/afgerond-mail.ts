/**
 * Onderwerp en tekst van de "afgerond gemeld"-mail naar de zaak: de monteur heeft een klus snel als
 * afgerond gemeld (geen volledig rapport). Pure functie, los te testen. Stijl gelijk aan
 * terugmeld-mail.ts. Afsluiter = de keukenzaak/organisatie.
 */
export function afgerondMeldingTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  toelichting: string | null,
  vervolgNodig: boolean,
  organisatie = "",
): { subject: string; text: string } {
  const subject = `Klus voltooid gemeld: ${klantNaam}`;
  const ref = referentienummer ? ` (ref ${referentienummer})` : "";
  const afzender = organisatie.trim() || "Het planning-team";
  const toel = toelichting?.trim() ? `\n\nNotitie van de monteur:\n${toelichting.trim()}` : "";
  const slot = vervolgNodig
    ? "Let op: er komt nog een vervolg (bijvoorbeeld onderdelen die later binnenkomen). De klus moet opnieuw ingepland worden."
    : "De monteur geeft aan dat de klus helemaal voltooid is.";
  const text = `Hoi,

${monteurNaam} heeft de klus voor ${klantNaam}${ref} als voltooid gemeld.

${slot}${toel}

Je vindt de klus op het dashboard.

${afzender}`;
  return { subject, text };
}
