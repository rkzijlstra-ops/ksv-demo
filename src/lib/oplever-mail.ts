import { rapportAfzenderWeergave, type RapportAfzender } from "./afzender";

/**
 * Onderwerp en tekst van de begeleidende e-mail bij het opleverrapport. Pure functie, los te testen.
 *
 * Bewust kaal gehouden: de foto's, de eventuele video-link en de monteur-opmerking staan al in de
 * PDF, dus die horen niet in de mailtekst. De ondertekening loopt mee met het monteur-profiel
 * (zelfde keten als het rapport), zodat From-naam en ondertekening altijd gelijk zijn.
 */
export function opleverMailTekst(opts: {
  klantNaam: string | null;
  referentienummer: string | null;
  afzender: RapportAfzender | null;
  heeftVideo: boolean;
}): { subject: string; text: string; afzenderNaam: string } {
  const klant = opts.klantNaam?.trim() || "de klant";
  const ref = opts.referentienummer ? ` (ref ${opts.referentienummer})` : "";
  const { kop, voet } = rapportAfzenderWeergave(opts.afzender);
  const mediaZin = opts.heeftVideo
    ? "De foto's en de video van de oplevering vindt u in het rapport in de bijlage."
    : "De foto's van de oplevering vindt u in het rapport in de bijlage.";
  const ondertekening = voet ? `${kop}\n${voet}` : kop;

  const subject = `Opleverrapport ${klant}${ref}`;
  const text = `Beste,

Hierbij het opleverrapport van de montage bij ${klant}${ref}. ${mediaZin}

Met vriendelijke groet,
${ondertekening}`;

  return { subject, text, afzenderNaam: kop };
}

/**
 * Bouwt de From-header met een vaste weergavenaam (de afzender-kop), maar behoudt het ingestelde
 * verzendadres uit RESEND_FROM. Zo is de naam bovenaan de mail dezelfde als de ondertekening.
 */
export function afzenderHeader(from: string, naam: string): string {
  const match = from.match(/<([^>]+)>/);
  const adres = (match ? match[1] : from).trim();
  return `${naam} <${adres}>`;
}
