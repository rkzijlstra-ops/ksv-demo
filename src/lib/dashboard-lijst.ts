import { ALLE_STATUSSEN } from "./opdracht-status";
import type { DashboardStatus } from "./db";

/** Filter inclusief de pseudo-status 'alle' (toont elke status). */
export type StatusFilter = DashboardStatus | "alle";

/** Velden waarop het dashboard zoekt en groepeert (een Melding voldoet hieraan). */
export interface ZoekbareOpdracht {
  klant_naam: string | null;
  referentienummer: string | null;
  monteur_naam: string | null;
  klant_adres: string | null;
  dashboard_status: DashboardStatus;
}

/** Matcht een opdracht op een vrije zoekterm (klant, referentie, monteur of adres). */
export function zoekMatch(opdracht: ZoekbareOpdracht, zoekterm: string): boolean {
  const q = zoekterm.trim().toLowerCase();
  if (q === "") return true;
  const velden = [
    opdracht.klant_naam,
    opdracht.referentienummer,
    opdracht.monteur_naam,
    opdracht.klant_adres,
  ];
  return velden.some((v) => v != null && v.toLowerCase().includes(q));
}

/** Filtert op statusfilter en zoekterm samen. */
export function filterOpdrachten<T extends ZoekbareOpdracht>(
  opdrachten: T[],
  { zoek, status }: { zoek: string; status: StatusFilter },
): T[] {
  return opdrachten.filter(
    (o) => (status === "alle" || o.dashboard_status === status) && zoekMatch(o, zoek),
  );
}

/**
 * Platte lijst treffers voor de zoek-dropdown: matcht over ALLE statussen (los van het statusfilter),
 * hoogstens `limiet` stuks. Een lege zoekterm geeft niets (dan toon je de dropdown niet). Pure functie.
 */
export function zoekTreffers<T extends ZoekbareOpdracht>(
  opdrachten: T[],
  zoekterm: string,
  limiet = 8,
): T[] {
  if (zoekterm.trim() === "") return [];
  return opdrachten.filter((o) => zoekMatch(o, zoekterm)).slice(0, limiet);
}

export interface StatusGroep<T> {
  status: DashboardStatus;
  opdrachten: T[];
}

/** Groepeert per status in de vaste levenscyclus-volgorde; lege groepen worden overgeslagen. */
export function groepeerPerStatus<T extends ZoekbareOpdracht>(opdrachten: T[]): StatusGroep<T>[] {
  return ALLE_STATUSSEN.map((status) => ({
    status,
    opdrachten: opdrachten.filter((o) => o.dashboard_status === status),
  })).filter((g) => g.opdrachten.length > 0);
}
