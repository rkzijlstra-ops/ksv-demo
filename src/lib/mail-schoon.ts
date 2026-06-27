/**
 * Maakt een doorgestuurde mailtekst geschikt als beknopte werkomschrijving: knipt geciteerde
 * reactie-historie, doorgestuurde headers, handtekeningen en standaard-footers eraf en houdt de
 * eigenlijke boodschap over. Deterministisch (geen AI), zodat het voorspelbaar en testbaar blijft.
 *
 * Aanpak: (1) houd de menselijke boodschap bovenaan (tot het eerste citaat/handtekening/doorstuur-blok).
 * (2) Is daar niets zinnigs (bijv. een mail die meteen met "Forwarded message" begint), pak dan de
 * doorgestuurde BODY: sla de doorstuur-kop (marker + header-blok) over en houd de tekst eronder.
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

// Markeert het begin van een doorgestuurd/oorspronkelijk bericht.
const FORWARD_MARKER =
  /(forwarded message|doorgestuurd bericht|begin forwarded message|oorspronkelijk bericht|original message)/i;
// Een mailheader-regel (ruimer dan KAP_PATRONEN; voor het overslaan van het doorstuur-kopblok).
const HEADER_REGEL =
  /^(van|from|verzonden|sent|datum|date|aan|to|cc|bcc|onderwerp|subject|reply-to|antwoord aan)\s*:/i;

function houdTopOver(regels: string[]): string {
  const behouden: string[] = [];
  for (const regel of regels) {
    if (KAP_PATRONEN.some((p) => p.test(regel.trim()))) break;
    behouden.push(regel);
  }
  return behouden.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function schoonOmschrijving(tekst: string | null | undefined): string | null {
  if (!tekst) return null;
  const regels = tekst.replace(/\r\n/g, "\n").split("\n");

  // 1) Menselijke boodschap bovenaan. Een losse "Forwarded message"-markeringsregel telt niet mee.
  const boven = houdTopOver(regels);
  const bovenZonderMarker = boven
    .split("\n")
    .filter((r) => !FORWARD_MARKER.test(r.trim()))
    .join("\n")
    .trim();
  if (bovenZonderMarker.length > 0) return bovenZonderMarker;

  // 2) Geen boodschap bovenaan -> pak de doorgestuurde body. Sla de marker en het aansluitende
  // header-blok (Van/Aan/Datum/Onderwerp ...) + lege regels over.
  let i = 0;
  const markerIdx = regels.findIndex((r) => FORWARD_MARKER.test(r.trim()));
  if (markerIdx !== -1) i = markerIdx + 1;
  while (i < regels.length && (HEADER_REGEL.test(regels[i].trim()) || regels[i].trim() === "")) i++;
  const body = houdTopOver(regels.slice(i));
  return body.length > 0 ? body : null;
}
