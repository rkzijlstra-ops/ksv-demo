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

/**
 * Waar de monteur heen gaat ná het versturen naar de opdrachtgever. Pure functie, los te testen.
 * Bij een vervolg (snel afsluiten + "klus is niet af") is de klus teruggegeven aan kantoor (ontplanned)
 * en dus niet meer leesbaar voor de monteur (RLS): ga naar de kluspool, niet naar de detailpagina (die
 * zou 404'en). Anders is de klus opgeleverd en blijft de detailpagina bereikbaar.
 */
export function bestemmingNaZaakVerzending(opts: {
  verkort: boolean;
  vervolgNodig: boolean;
  opdrachtId: string;
}): string {
  return opts.verkort && opts.vervolgNodig ? "/" : `/opdracht/${opts.opdrachtId}`;
}

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
