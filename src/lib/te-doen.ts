import { isActief } from "./opdracht-status";
import type { DashboardStatus } from "./db";

/** Minimale velden voor de "Te doen"-telling (een Melding voldoet hieraan). */
export interface TellbareOpdracht {
  dashboard_status: DashboardStatus;
  gewijzigd_te_versturen: boolean;
  referentienummer: string | null;
}

/** Tellers voor het "Te doen"-overzicht bovenaan het dashboard. */
export interface TeDoenTelling {
  /** Binnengekomen, nog niet ingepland. */
  tePlannen: number;
  /** Concept gepland of een verstuurde opdracht die opnieuw moet (verstuur-knop-teller). */
  teVersturen: number;
  /** Verstuurd maar nog niet bevestigd door de monteur. */
  nietBevestigd: number;
  /** Actief werk dat aandacht vraagt, nu: ontbrekend referentienummer. */
  aandacht: number;
}

/**
 * Bundelt in één pass wat er op de opdrachtgever wacht (design: "Te doen"-overzicht).
 * Pure functie over de dashboard-lijst, los testbaar; de UI rendert klikbare tellers.
 * Let op: te plannen, te versturen en niet bevestigd zijn elkaar uitsluitende statussen,
 * dus geen dubbeltelling. De gewijzigd-marker zit alleen op gepland/bevestigd (zie
 * moetOpnieuwVersturen), dus ook daar geen overlap met concept_gepland.
 */
export function teDoenTelling(opdrachten: TellbareOpdracht[]): TeDoenTelling {
  const t: TeDoenTelling = { tePlannen: 0, teVersturen: 0, nietBevestigd: 0, aandacht: 0 };
  for (const o of opdrachten) {
    if (o.dashboard_status === "binnen") t.tePlannen += 1;
    if (o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen) t.teVersturen += 1;
    if (o.dashboard_status === "gepland") t.nietBevestigd += 1;
    if (isActief(o.dashboard_status) && o.referentienummer === null) t.aandacht += 1;
  }
  return t;
}
