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
 * Of een wijziging na versturen opnieuw verstuurd moet worden, rekening houdend met de plek
 * (monteur/dag/tijd) én de duur. Een al verstuurde klus die langer of korter wordt gemaakt (resize)
 * verandert wat de monteur moet weten, ook al staat hij nog op dezelfde dag bij dezelfde monteur.
 * Daarom: opnieuw nodig zodra de klus al verstuurd was en óf de plek óf de duur is veranderd.
 * Pure functie, los te testen. (`plekGelijk` = opVerzondenPlek, `duurGelijk` = nieuwe duur == oude duur.)
 */
export function moetOpnieuwVersturenNa(
  huidigeStatus: DashboardStatus,
  plekGelijk: boolean,
  duurGelijk: boolean,
): boolean {
  return moetOpnieuwVersturen(huidigeStatus) && !(plekGelijk && duurGelijk);
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

/** Wat een (her)verstuurde opdracht voor de notificaties betekent. */
export interface VerzendingSoort {
  /** Eerder verstuurd én aan dezelfde monteur: een verzetting (andere datum/tijd), geen nieuwe klus. */
  verzet: boolean;
  /**
   * Gevuld bij een monteur-WISSEL: de monteur aan wie de klus eerder verstuurd was en die nu bericht
   * krijgt dat de klus niet meer van hem is. Null als de monteur niet wisselde.
   */
  vorigeMonteur: { toegewezen_aan: string; monteur_naam: string | null } | null;
}

/**
 * Bepaalt wat een (her)verstuurronde voor de monteur(s) betekent, op basis van de verzonden plek van
 * vóór deze ronde (de opdracht moet vóór markeerVerzonden gelezen zijn). Drie gevallen:
 *  - nooit eerder verstuurd  -> nieuwe klus (verzet=false, vorigeMonteur=null)
 *  - eerder verstuurd, zelfde monteur -> verzetting (verzet=true)
 *  - eerder verstuurd, andere monteur -> nieuw voor de nieuwe monteur, en de vorige monteur krijgt
 *    bericht dat de klus weg is (vorigeMonteur gevuld). Pure functie, los te testen.
 */
export function klassificeerVerzending(o: {
  toegewezen_aan: string | null;
  verzonden_toegewezen_aan: string | null;
  verzonden_monteur: string | null;
}): VerzendingSoort {
  const eerderVerstuurd = o.verzonden_toegewezen_aan != null;
  const monteurGewisseld = eerderVerstuurd && o.verzonden_toegewezen_aan !== o.toegewezen_aan;
  return {
    verzet: eerderVerstuurd && !monteurGewisseld,
    vorigeMonteur: monteurGewisseld
      ? { toegewezen_aan: o.verzonden_toegewezen_aan as string, monteur_naam: o.verzonden_monteur }
      : null,
  };
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
