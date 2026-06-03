import type { DashboardStatus } from "./db";

/** Statussen die op het planbord verschijnen (de rest staat in de pool of het archief). */
const OP_BORD: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "concept_gepland",
  "gepland",
  "bevestigd",
]);

const WERKDAGEN = 5;

// ---- datum-helpers (UTC, om tijdzone-verschuiving te vermijden) ----

function parse(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Datum N dagen verder (of terug bij negatief). */
export function verschuifDagen(iso: string, dagen: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + dagen);
  return format(d);
}

/** Maandag van de week waar deze datum in valt (zondag valt nog bij de week ervoor). */
export function maandagVan(iso: string): string {
  const d = parse(iso);
  const dow = d.getUTCDay(); // 0=zo, 1=ma, ... 6=za
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return format(d);
}

/** De vijf werkdagen (ma t/m vr) vanaf een maandag. */
export function weekDagen(maandagIso: string): string[] {
  return Array.from({ length: WERKDAGEN }, (_, i) => verschuifDagen(maandagIso, i));
}

/** ISO 8601-weeknummer (donderdag-regel). */
export function weeknummer(iso: string): number {
  const d = parse(iso);
  const dagNr = (d.getUTCDay() + 6) % 7; // ma=0 ... zo=6
  d.setUTCDate(d.getUTCDate() - dagNr + 3); // naar de donderdag van deze week
  const eersteDonderdag = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const eersteDagNr = (eersteDonderdag.getUTCDay() + 6) % 7;
  eersteDonderdag.setUTCDate(eersteDonderdag.getUTCDate() - eersteDagNr + 3);
  return 1 + Math.round((d.getTime() - eersteDonderdag.getTime()) / (7 * 86_400_000));
}

// ---- plaatsing op het bord ----

/** Minimale velden die het planbord van een opdracht nodig heeft (een Melding voldoet hieraan). */
export interface PlanbaarOpdracht {
  id: string;
  toegewezen_aan: string | null;
  startdatum: string | null;
  starttijd: string | null;
  duur_dagen: number;
  dashboard_status: DashboardStatus;
}

export interface PlanbordPlaatsing<T extends PlanbaarOpdracht = PlanbaarOpdracht> {
  opdracht: T;
  /** Kolomindex 0..4 (ma..vr). */
  dagIndex: number;
  /** Aantal dagkolommen dat het blok beslaat (service altijd 1, montage geknipt op vrijdag). */
  span: number;
  /** True = service (kaartje op tijd), false = montage (dagblok). */
  isService: boolean;
}

/** Unieke, alfabetisch gesorteerde monteurs uit de geplande opdrachten (de rijen van het bord). */
export function monteurRijen(opdrachten: PlanbaarOpdracht[]): string[] {
  const set = new Set<string>();
  for (const o of opdrachten) {
    if (OP_BORD.has(o.dashboard_status) && o.toegewezen_aan) set.add(o.toegewezen_aan);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "nl"));
}

/**
 * Plaatst geplande opdrachten op het weekraster: bepaalt per opdracht de dagkolom en span.
 * Montage (geen starttijd) = dagblok dat duur_dagen kolommen beslaat, geknipt op vrijdag.
 * Service (met starttijd) = kaartje van één kolom. Opdrachten buiten de week of met een
 * niet-geplande status vallen weg. Pure functie, los te testen.
 */
export function plaatsOpdrachten<T extends PlanbaarOpdracht>(
  opdrachten: T[],
  weekDagenArr: string[],
): PlanbordPlaatsing<T>[] {
  const plaatsingen: PlanbordPlaatsing<T>[] = [];
  for (const o of opdrachten) {
    if (!OP_BORD.has(o.dashboard_status) || !o.toegewezen_aan || !o.startdatum) continue;
    const dagIndex = weekDagenArr.indexOf(o.startdatum.split("T")[0]);
    if (dagIndex === -1) continue;
    const isService = o.starttijd != null && o.starttijd !== "";
    const ruimte = WERKDAGEN - dagIndex;
    const span = isService ? 1 : Math.min(Math.max(o.duur_dagen, 1), ruimte);
    plaatsingen.push({ opdracht: o, dagIndex, span, isService });
  }
  return plaatsingen;
}
