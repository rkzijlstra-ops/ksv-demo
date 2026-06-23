import type { Melding, Opdrachtgever } from "./db";

/**
 * Mag de monteur deze klus ook rechtstreeks aan de klant opleveren?
 *
 * - Eigen klus (geen opdrachtgever): altijd, de monteur is zelf de baas over zijn klus.
 * - Opdrachtgever-klus: alleen als die opdrachtgever klant-levering toestaat. Niet gevonden of
 *   onbekend = veilig nee (geen ongewenste klant-versie).
 *
 * Bepaalt of de klant-kant (keuzekaart "ook aan de klant", interne "voor de opdrachtgever"-blok,
 * en de klant-verzendkaart) in de oplever-flow getoond wordt.
 */
export function magKlantLeveren(
  opdracht: Pick<Melding, "opdrachtgever_id">,
  opdrachtgever: Pick<Opdrachtgever, "klant_levering_toegestaan"> | null,
): boolean {
  if (!opdracht.opdrachtgever_id) return true;
  return opdrachtgever?.klant_levering_toegestaan ?? false;
}
