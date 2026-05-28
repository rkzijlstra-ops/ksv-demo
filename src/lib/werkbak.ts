import type { Melding } from "./db";

export interface Werkbak {
  actief: Melding[];
  history: Melding[];
}

/**
 * Splitst meldingen in actief werk (concept + nog niet verzonden PDF-klussen)
 * en history (verzonden). Volgorde binnen elke groep blijft behouden.
 */
export function groepeerMeldingen(meldingen: Melding[]): Werkbak {
  const actief: Melding[] = [];
  const history: Melding[] = [];
  for (const m of meldingen) {
    if (m.status === "verzonden") {
      history.push(m);
    } else {
      actief.push(m);
    }
  }
  return { actief, history };
}
