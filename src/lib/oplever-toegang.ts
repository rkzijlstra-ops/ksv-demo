/**
 * Bepaalt of een opgeleverde klus opnieuw bewerkt mag worden. Pure functie, los te testen.
 *
 * Regel (toestand x rol): pas als de klus echt OPGELEVERD is (niet zomaar "een keer iets verstuurd",
 * want een vervolg gaat via heropenen weer naar 'open' terwijl de verzendgeschiedenis blijft staan).
 * - Niet opgeleverd: gewoon bewerken (eigen én opdrachtgever).
 * - Opgeleverd:
 *   - eigen klus (geen opdrachtgever): bewerken mag, maar mét waarschuwing.
 *   - opdrachtgever-klus: read-only (bekijken, niet wijzigen of opnieuw versturen).
 *
 * "Eigen klus" = geen `opdrachtgever_id`.
 */
export type OpleverToegang = {
  eigen: boolean;
  readOnly: boolean;
  waarschuwBestaand: boolean;
  /** De datum (ISO) van de eerste verzending, of null als er nog niets verstuurd is. */
  verstuurdOp: string | null;
};

export function opleverToegang(opts: {
  opdrachtgeverId: string | null | undefined;
  opgeleverd: boolean;
  verzendingen: { created_at: string }[];
}): OpleverToegang {
  const eigen = !opts.opdrachtgeverId;
  const verstuurdOp = opts.verzendingen.length
    ? opts.verzendingen.map((v) => v.created_at).sort((a, b) => a.localeCompare(b))[0]
    : null;
  return {
    eigen,
    readOnly: opts.opgeleverd && !eigen,
    waarschuwBestaand: opts.opgeleverd && eigen,
    verstuurdOp,
  };
}
