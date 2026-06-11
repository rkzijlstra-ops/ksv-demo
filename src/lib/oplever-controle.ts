/**
 * Vaste controlepunten die de klant bij de oplevering samen met de monteur aftekent (akkoord / niet
 * akkoord), net boven de handtekening. Eén bron van waarheid voor zowel het opleverscherm als het
 * rapport. De punt-tekst wordt bij de oplevering meeopgeslagen, zodat het rapport later precies toont
 * wat er die dag is afgevinkt, ook als deze lijst ooit wijzigt.
 */
export const CONTROLE_PUNTEN: readonly string[] = [
  "Buiten de evt. meldingen geen beschadigingen aan: keuken, keukenblad, vloer, plafond en muren.",
];

/** Eén afgetekend controlepunt zoals opgeslagen bij de oplevering. */
export interface ControlePunt {
  /** De volledige punt-tekst (meegeslagen voor het rapport). */
  punt: string;
  /** True = akkoord, false = niet akkoord. */
  akkoord: boolean;
}
