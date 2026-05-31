// Eindstaat-keuze (afgerond/openstaande punten) is geschrapt: gaf de monteur geen winst,
// alleen een extra beslissing. Versturen mag altijd; zonder bewijs een zachte waarschuwing.

export type Uitkomst = "afgerond" | "openstaande_punten";

export interface OpleverInvoer {
  fotoCount: number;
  heeftVideo: boolean;
}

export interface OpleverCheck {
  /** Foto of video aanwezig als bewijs. */
  heeftBewijs: boolean;
  /** Versturen mag altijd (zacht verplicht). */
  magVersturen: boolean;
  /** Zachte waarschuwing als er geen bewijs is, anders null. */
  waarschuwing: string | null;
}

export function controleerOplevering(invoer: OpleverInvoer): OpleverCheck {
  const heeftBewijs = invoer.fotoCount > 0 || invoer.heeftVideo;
  return {
    heeftBewijs,
    magVersturen: true,
    waarschuwing: heeftBewijs ? null : "Geen foto of video vastgelegd. Toch doorgaan?",
  };
}
