import { formatDatumKort } from "./datum";
import type { MailbareOpdracht } from "./monteur-mail";

/** App-link kort weergeven: zonder protocol, en leeg als er geen URL is geconfigureerd. */
function linkRegel(appUrl: string): string {
  const kaal = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return kaal ? `Check de app: ${kaal}` : "Check de app.";
}

function refDeel(ref: string | null): string {
  return ref ? ` (ref ${ref})` : "";
}

/**
 * SMS bij een verstuurronde, gebundeld per monteur. Een klus krijgt details, meerdere klussen een
 * telling. Plat en kort gehouden zodat het in een SMS-deel (160 tekens) past.
 */
export function nieuweOpdrachtenSmsTekst(
  monteurNaam: string,
  opdrachten: MailbareOpdracht[],
  appUrl: string,
): string {
  if (opdrachten.length === 1) {
    const o = opdrachten[0];
    const klant = o.klant_naam ?? "klant";
    const wanneer = o.startdatum
      ? o.starttijd
        ? `${formatDatumKort(o.startdatum)} ${o.starttijd.slice(0, 5)}`
        : formatDatumKort(o.startdatum)
      : "datum volgt";
    return `Hoi ${monteurNaam}, nieuwe klus: ${klant}${refDeel(o.referentienummer)}, ${wanneer}. ${linkRegel(appUrl)}`;
  }
  return `Hoi ${monteurNaam}, je hebt ${opdrachten.length} nieuwe of gewijzigde klussen. ${linkRegel(appUrl)}`;
}

export function annuleringSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  appUrl: string,
): string {
  return `Hoi ${monteurNaam}, klus ${klantNaam}${refDeel(referentienummer)} is geannuleerd. ${linkRegel(appUrl)}`;
}

export function ontplanningSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
): string {
  return `Hoi ${monteurNaam}, klus ${klantNaam}${refDeel(referentienummer)} is bij je weggehaald. Je hoeft er niet heen.`;
}

export function nieuwDocumentSmsTekst(
  monteurNaam: string,
  klantNaam: string,
  referentienummer: string | null,
  appUrl: string,
): string {
  return `Hoi ${monteurNaam}, nieuw document bij klus ${klantNaam}${refDeel(referentienummer)}. ${linkRegel(appUrl)}`;
}

/** Bundelt openstaande bevestigingen in een herinnering. Bij veel klussen alleen een telling. */
export function herinneringSmsTekst(
  monteurNaam: string,
  klantNamen: string[],
  appUrl: string,
): string {
  const wat = klantNamen.length === 1 ? `klus ${klantNamen[0]}` : `${klantNamen.length} klussen`;
  const kaal = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `Hoi ${monteurNaam}, je hebt ${wat} nog niet bevestigd. Bevestig in de app: ${kaal}`;
}
