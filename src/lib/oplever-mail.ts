import { rapportAfzenderWeergave, type RapportAfzender } from "./afzender";

/**
 * Onderwerp en tekst van de begeleidende e-mail bij het opleverrapport. Pure functie, los te testen.
 *
 * Bewust kaal gehouden: de foto's, de eventuele video-link en de monteur-opmerking staan al in de
 * PDF, dus die horen niet in de mailtekst. De afzendernaam bovenaan (From-kop) blijft het bedrijf;
 * de ondertekening tekent met de persoonsnaam uit het profiel en zet de bedrijfs- en contactgegevens
 * op een eigen regel daaronder.
 */
export function opleverMailTekst(opts: {
  klantNaam: string | null;
  referentienummer: string | null;
  afzender: RapportAfzender | null;
  heeftVideo: boolean;
}): { subject: string; text: string; afzenderNaam: string } {
  const klant = opts.klantNaam?.trim() || "de klant";
  const ref = opts.referentienummer ? ` (ref ${opts.referentienummer})` : "";
  const { kop } = rapportAfzenderWeergave(opts.afzender);
  const mediaZin = opts.heeftVideo
    ? "De foto's en de video van de oplevering vindt u in het rapport in de bijlage."
    : "De foto's van de oplevering vindt u in het rapport in de bijlage.";

  // Ondertekening: de persoonsnaam als afsluiting (wie tekent), met een witregel daaronder de
  // bedrijfs- en contactgegevens. Bewust niet de gedeelde `voet`: die begint met de bedrijfsnaam,
  // die al als afzender-kop dient, waardoor naam/bedrijf dubbel onder elkaar zou komen. Los
  // opgebouwd, zodat in elke toestand (bedrijf+naam, alleen bedrijf, alleen naam, leeg) niets dubbelt.
  const naam = opts.afzender?.naam?.trim() || null;
  const bedrijf = opts.afzender?.bedrijfsnaam?.trim() || null;
  const persoonsregel = naam || bedrijf || "Keukenmontage";
  const contactDelen = [
    bedrijf && bedrijf !== persoonsregel ? bedrijf : null,
    opts.afzender?.telefoon?.trim() || null,
    opts.afzender?.email?.trim() || null,
  ].filter(Boolean);
  const ondertekening = contactDelen.length
    ? `${persoonsregel}\n\n${contactDelen.join("  ·  ")}`
    : persoonsregel;

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
