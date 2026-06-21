/**
 * Maakt een doorgestuurde mailtekst geschikt als beknopte werkomschrijving: knipt geciteerde
 * reactie-historie, doorgestuurde headers, handtekeningen en standaard-footers eraf en houdt de
 * eigenlijke boodschap over. Deterministisch (geen AI), zodat het voorspelbaar en testbaar blijft.
 *
 * Aanpak: loop de regels van boven naar onder; bij de eerste regel die een citaat/handtekening/
 * doorstuur-blok inluidt, kappen we de rest af. Wat overblijft is de menselijke boodschap bovenaan.
 */
const KAP_PATRONEN: RegExp[] = [
  /^>/, // geciteerde regel
  /^--\s*$/, // handtekening-scheiding
  /^met vriendelijke groet/i,
  /^vriendelijke groet/i,
  /^hartelijke groet/i,
  /^m\.?v\.?g\.?\b/i,
  /^groet(en)?\s*[,.!]?\s*$/i,
  /^verzonden vanaf mijn\b/i,
  /^sent from my\b/i,
  /^op\b.*\bschreef\b/i, // "Op <datum> schreef <x>:"
  /^on\b.*\bwrote\b/i,
  /^(van|from|verzonden|sent)\s*:/i, // doorgestuurde header-blok
];

export function schoonOmschrijving(tekst: string | null | undefined): string | null {
  if (!tekst) return null;
  const regels = tekst.replace(/\r\n/g, "\n").split("\n");
  const behouden: string[] = [];
  for (const regel of regels) {
    const t = regel.trim();
    if (KAP_PATRONEN.some((p) => p.test(t))) break;
    behouden.push(regel);
  }
  const resultaat = behouden.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return resultaat.length > 0 ? resultaat : null;
}
