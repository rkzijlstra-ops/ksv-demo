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

/**
 * De plek waarop een opdracht stond toen hij verstuurd werd. Identiteit van de monteur =
 * `toegewezen_aan` (het account), niet de naam: twee monteurs kunnen dezelfde naam hebben.
 * `monteur_naam` blijft erbij voor de weergave (kolom verzonden_monteur).
 */
export interface VerzondenPlek {
  toegewezen_aan: string | null;
  monteur_naam: string | null;
  startdatum: string | null;
  starttijd: string | null;
}

/**
 * Staat een nieuwe planning exact op de verzonden plek? Zo ja, dan is er feitelijk niets veranderd
 * sinds het versturen en hoeft de opdracht niet opnieuw. Vergelijkt op account (toegewezen_aan),
 * dag en tijd (HH:MM, "10:00" == "10:00:00"). Nooit verstuurd (geen verzonden datum) telt niet mee.
 */
export function opVerzondenPlek(
  nieuw: { toegewezen_aan: string | null; startdatum: string | null; starttijd: string | null },
  verzonden: VerzondenPlek | null | undefined,
): boolean {
  if (!verzonden || !verzonden.startdatum) return false;
  const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
  return (
    nieuw.toegewezen_aan === verzonden.toegewezen_aan &&
    nieuw.startdatum === verzonden.startdatum &&
    hhmm(nieuw.starttijd) === hhmm(verzonden.starttijd)
  );
}

/**
 * De uitvoerdatum die de MONTEUR moet zien. Is er een wijziging na versturen die nog niet opnieuw
 * verstuurd is (gewijzigd_te_versturen), dan ziet hij de afgesproken (verzonden) datum, niet de
 * concept-wijziging van kantoor. Pas bij opnieuw versturen krijgt hij de nieuwe datum (en bericht).
 * Zo verandert de afspraak in zijn app nooit stil. Pure functie.
 */
export function uitvoerdatumVoorMonteur(o: {
  uitvoerdatum: string | null;
  gewijzigd_te_versturen: boolean;
  verzonden_startdatum: string | null;
}): string | null {
  if (o.gewijzigd_te_versturen && o.verzonden_startdatum) return o.verzonden_startdatum;
  return o.uitvoerdatum;
}
