/**
 * Onderwerp en tekst van de bevestig-herinnering naar de monteur: hij heeft een of meer verstuurde
 * klussen nog niet bevestigd. Gebundeld per monteur, net als de SMS-variant. Pure functie, los te
 * testen. Afsluiter = de keukenzaak (consistent met de andere app-mails).
 */
export function herinneringTekst(
  monteurNaam: string,
  klantNamen: string[],
  organisatie = "",
): { subject: string; text: string } {
  const n = klantNamen.length;
  const afzender = organisatie.trim() || "Het planning-team";
  const subject =
    n === 1
      ? `Herinnering: bevestig je klus voor ${klantNamen[0]}`
      : `Herinnering: bevestig je ${n} klussen`;
  const intro =
    n === 1
      ? `Je hebt de klus voor ${klantNamen[0]} nog niet bevestigd.`
      : `Je hebt ${n} klussen nog niet bevestigd:\n\n${klantNamen.map((k) => `- ${k}`).join("\n")}`;
  const text = `Hoi ${monteurNaam},

${intro}

Bevestig de ontvangst in de app, dan weet kantoor dat je de klus hebt gezien.

${afzender}`;
  return { subject, text };
}
