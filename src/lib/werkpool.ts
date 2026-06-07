import type { Melding, DashboardStatus } from "./db";

export interface Werkpool {
  actief: Melding[];
  history: Melding[];
}

/**
 * Statussen die NIET in de monteur-werkpool thuishoren, ook al staat de klus aan hem toegewezen:
 * - geannuleerd: de klus gaat niet door, hij hoeft er niets mee (toewijzing blijft wel voor het
 *   dossier aan kantoor-kant).
 * - concept_gepland: kantoor heeft hem wel ingepland maar nog niet verstuurd; pas bij versturen is
 *   het een afspraak voor de monteur (de verstuur-poort bepaalt wat hij ziet).
 * Eigen, zelf-ingeschoten klussen (status binnen) blijven gewoon staan.
 */
const VERBORGEN_VOOR_MONTEUR: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "concept_gepland",
  "geannuleerd",
]);

/**
 * Splitst de aan een monteur toegewezen klussen in actief werk en history, en verbergt wat niet in
 * zijn werkpool thuishoort (geannuleerd, nog niet verstuurd concept). History = opgeleverde
 * opdrachten (of legacy verzonden-status). Volgorde binnen elke groep blijft behouden. Pure functie.
 */
export function groepeerMeldingen(meldingen: Melding[]): Werkpool {
  const actief: Melding[] = [];
  const history: Melding[] = [];
  for (const m of meldingen) {
    if (VERBORGEN_VOOR_MONTEUR.has(m.dashboard_status)) continue;
    // Teruggemeld of opgeleverd: uit de actieve pool, maar in de history zodat de monteur het
    // (met de reden) kan terugkijken. Legacy verzonden-status idem.
    if (m.teruggemeld_at || m.opdracht_status === "opgeleverd" || m.status === "verzonden") {
      history.push(m);
    } else {
      actief.push(m);
    }
  }
  return { actief, history };
}
