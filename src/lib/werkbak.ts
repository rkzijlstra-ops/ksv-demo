import type { Melding } from "./db";

export interface Werkbak {
  actief: Melding[];
  history: Melding[];
}

/**
 * Splitst opdrachten in actief werk en history. History = opgeleverde opdrachten
 * (of legacy verzonden-status). Volgorde binnen elke groep blijft behouden.
 */
export function groepeerMeldingen(meldingen: Melding[]): Werkbak {
  const actief: Melding[] = [];
  const history: Melding[] = [];
  for (const m of meldingen) {
    if (m.opdracht_status === "opgeleverd" || m.status === "verzonden") {
      history.push(m);
    } else {
      actief.push(m);
    }
  }
  return { actief, history };
}
