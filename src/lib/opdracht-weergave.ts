import { formatDatumKort } from "./datum";

/** Velden die de planning-weergave nodig heeft (een Melding voldoet hieraan). */
export interface PlanbareOpdracht {
  startdatum: string | null;
  starttijd: string | null;
  duur_dagen: number;
}

/**
 * Korte planning-tekst voor een dashboard-kaart, volgens het invoermodel:
 * - geen startdatum -> "Nog niet gepland"
 * - starttijd ingevuld (service) -> "12 jun · 10:00"
 * - geen starttijd (montage, dagblok) -> "start 14 jun"
 */
export function planningTijd(opdracht: PlanbareOpdracht): string {
  if (!opdracht.startdatum) return "Nog niet gepland";
  const datum = formatDatumKort(opdracht.startdatum);
  if (opdracht.starttijd) {
    return `${datum} · ${opdracht.starttijd.slice(0, 5)}`;
  }
  return `start ${datum}`;
}

/** "1 dag" / "N dagen". */
export function duurLabel(duurDagen: number): string {
  return `${duurDagen} ${duurDagen === 1 ? "dag" : "dagen"}`;
}

/** Eerste letter een hoofdletter (voor het netjes invoeren van een monteurnaam). */
export function kapitaliseerEerste(tekst: string): string {
  if (tekst === "") return tekst;
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}
