import type { DashboardStatus } from "./db";

/** Alle statussen in levenscyclus-volgorde (geannuleerd als zijtak achteraan). */
export const ALLE_STATUSSEN: readonly DashboardStatus[] = [
  "binnen",
  "concept_gepland",
  "gepland",
  "bevestigd",
  "opgeleverd",
  "geannuleerd",
] as const;

export interface DashboardStatusStijl {
  /** Tekstlabel voor badge en lijst. */
  label: string;
  /** Naam van het CSS-kleurtoken uit globals.css (zonder `--color-` prefix). */
  kleurToken: string;
  /** Gestreepte rand: nog niet verstuurd / opnieuw te versturen (verstuur-poort). */
  gestreept: boolean;
  /** Doorgehaald weergeven: geannuleerd. */
  doorhaling: boolean;
}

const STIJLEN: Record<DashboardStatus, DashboardStatusStijl> = {
  binnen: { label: "Binnen", kleurToken: "ink-muted", gestreept: false, doorhaling: false },
  concept_gepland: {
    label: "Concept gepland",
    kleurToken: "accent",
    gestreept: true,
    doorhaling: false,
  },
  gepland: { label: "Gepland", kleurToken: "accent", gestreept: false, doorhaling: false },
  bevestigd: { label: "Bevestigd", kleurToken: "bevestigd", gestreept: false, doorhaling: false },
  opgeleverd: { label: "Opgeleverd", kleurToken: "success", gestreept: false, doorhaling: false },
  geannuleerd: {
    label: "Geannuleerd",
    kleurToken: "ink-muted",
    gestreept: false,
    doorhaling: true,
  },
};

/** Stijl (label, kleurtoken, vlaggen) voor een opdracht-status. Altijd kleur + label tonen. */
export function statusStijl(status: DashboardStatus): DashboardStatusStijl {
  return STIJLEN[status];
}

const ACTIEVE_STATUSSEN: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "binnen",
  "concept_gepland",
  "gepland",
  "bevestigd",
]);

/**
 * Actief werk = altijd zichtbaar op het dashboard. Opgeleverd en geannuleerd vallen onder
 * de 14-dagen-scoping en daarna het archief (zie scopeVoorDashboard).
 */
export function isActief(status: DashboardStatus): boolean {
  return ACTIEVE_STATUSSEN.has(status);
}

const REEDS_VERSTUURD: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "gepland",
  "bevestigd",
]);

/**
 * Bepaalt of een wijziging op een opdracht de markering "gewijzigd, nog te versturen" verdient:
 * alleen als de opdracht al naar de monteur is gegaan (gepland of bevestigd). Een nog niet
 * verstuurde opdracht (binnen/concept_gepland) hoeft niet opnieuw, die gaat gewoon mee in de
 * eerste verstuur-ronde.
 */
export function moetOpnieuwVersturen(huidigeStatus: DashboardStatus): boolean {
  return REEDS_VERSTUURD.has(huidigeStatus);
}
