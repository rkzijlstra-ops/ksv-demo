import type { Melding, DashboardStatus } from "./db";
import { uitvoerdatumVoorMonteur } from "./opdracht-status";

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
    // Voltooid gemeld, teruggemeld of opgeleverd: uit de actieve pool, in de history om terug te kijken.
    // Uitzondering: voltooid MET een vervolg (ad-hoc klus, bleef bij de monteur) blijft actief, want
    // hij moet er nog iets mee. Legacy verzonden-status idem als opgeleverd.
    const voltooidZonderVervolg = Boolean(m.afgerond_door_monteur_at) && !m.afgerond_vervolg_nodig;
    if (voltooidZonderVervolg || m.teruggemeld_at || m.opdracht_status === "opgeleverd" || m.status === "verzonden") {
      history.push(m);
    } else {
      actief.push(m);
    }
  }
  actief.sort(sorteerActief);
  return { actief, history };
}

/**
 * Volgorde van de actieve werkpool: geplande klussen eerst, op uitvoerdatum oplopend (de eerstvolgende
 * bovenaan), bij gelijke datum op starttijd. Klussen zonder datum komen daarna, nieuwste invoer eerst.
 * Zo komt een zelf ingevoerde klus met datum meteen op de juiste plek te staan.
 */
function sorteerActief(a: Melding, b: Melding): number {
  const da = uitvoerdatumVoorMonteur(a);
  const dbtum = uitvoerdatumVoorMonteur(b);
  if (da && dbtum) {
    if (da !== dbtum) return da < dbtum ? -1 : 1;
    const ta = a.starttijd ?? "99:99";
    const tb = b.starttijd ?? "99:99";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return 0;
  }
  if (da && !dbtum) return -1;
  if (!da && dbtum) return 1;
  // Beide ongepland: nieuwste invoer eerst (created_at aflopend).
  if (a.created_at === b.created_at) return 0;
  return a.created_at < b.created_at ? 1 : -1;
}
