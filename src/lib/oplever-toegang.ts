/**
 * Bepaalt of een al verstuurde oplevering opnieuw bewerkt mag worden. Pure functie, los te testen.
 *
 * Regel (toestand x rol):
 * - Nog niets verstuurd: gewoon bewerken (eigen én opdrachtgever).
 * - Al minstens één keer een rapport verstuurd:
 *   - eigen klus (geen opdrachtgever): bewerken mag, maar mét waarschuwing.
 *   - opdrachtgever-klus: read-only (bekijken, niet wijzigen of opnieuw versturen).
 *
 * "Eigen klus" = geen `opdrachtgever_id`. "Al verstuurd" = er is minstens één rapport-verzending.
 */
export type OpleverToegang = {
  alVerstuurd: boolean;
  eigen: boolean;
  readOnly: boolean;
  waarschuwBestaand: boolean;
  /** De datum (ISO) van de eerste verzending, of null als er nog niets verstuurd is. */
  verstuurdOp: string | null;
};

export function opleverToegang(opts: {
  opdrachtgeverId: string | null | undefined;
  verzendingen: { created_at: string }[];
}): OpleverToegang {
  const alVerstuurd = opts.verzendingen.length > 0;
  const eigen = !opts.opdrachtgeverId;
  const verstuurdOp = alVerstuurd
    ? opts.verzendingen
        .map((v) => v.created_at)
        .sort((a, b) => a.localeCompare(b))[0]
    : null;
  return {
    alVerstuurd,
    eigen,
    readOnly: alVerstuurd && !eigen,
    waarschuwBestaand: alVerstuurd && eigen,
    verstuurdOp,
  };
}
