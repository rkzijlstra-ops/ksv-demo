export type Uitkomst = "afgerond" | "openstaande_punten";

export interface OpleverInvoer {
  fotoCount: number;
  heeftVideo: boolean;
  uitkomst: Uitkomst | null;
}

export interface OpleverCheck {
  /** Foto of video aanwezig als bewijs. */
  heeftBewijs: boolean;
  /** Uitkomst is gekozen (hard vereist om te kunnen versturen). */
  uitkomstGekozen: boolean;
  /** Mag verstuurd worden. Uitkomst is hard vereist; bewijs is zacht (zie waarschuwing). */
  magVersturen: boolean;
  /** Zachte waarschuwing als er geen bewijs is, anders null. */
  waarschuwing: string | null;
}

/**
 * Beslissingslogica voor de oplever-flow. Zacht verplicht: zonder foto of video mag je
 * wel versturen, maar krijg je een waarschuwing. Uitkomst kiezen is wel hard vereist.
 */
export function controleerOplevering(invoer: OpleverInvoer): OpleverCheck {
  const heeftBewijs = invoer.fotoCount > 0 || invoer.heeftVideo;
  const uitkomstGekozen = invoer.uitkomst !== null;
  return {
    heeftBewijs,
    uitkomstGekozen,
    magVersturen: uitkomstGekozen,
    waarschuwing: heeftBewijs
      ? null
      : "Geen foto of video vastgelegd. Toch doorgaan?",
  };
}
