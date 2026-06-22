import type { DashboardStatus } from "./db";

/**
 * Statussen die op het planbord verschijnen (de rest staat in de pool of het archief). Opgeleverd hoort
 * erbij: een afgeronde klus blijft op zijn dag staan (groen gemarkeerd) zodat het bord een
 * waarheidsgetrouwe agenda blijft i.p.v. een gat te tonen. Hij valt vanzelf weg zodra hij buiten het
 * archief-venster (ARCHIEF_DAGEN) valt.
 */
const OP_BORD: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "concept_gepland",
  "gepland",
  "bevestigd",
  "opgeleverd",
]);

/**
 * Statussen die meetellen voor een dubbele-boeking-conflict: alleen nog te doen werk. Een opgeleverde
 * klus is klaar en mag een nieuwe klus op dezelfde dag/tijd niet als "dubbel" laten oplichten.
 */
const BOEKBAAR: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
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

/** True als de datum op een werkdag (ma t/m vr) valt. */
function isWerkdag(iso: string): boolean {
  const dow = parse(iso).getUTCDay(); // 0=zo, 6=za
  return dow !== 0 && dow !== 6;
}

/**
 * De dagen die een opdracht beslaat, vanaf de startdatum:
 *  - Begint de klus op een WERKDAG (ma t/m vr), dan telt hij `aantal` werkdagen en slaat het weekend
 *    over (een meerdaagse montage loopt netjes door op maandag i.p.v. in het weekend).
 *  - Begint de klus bewust IN het weekend (za/zo), dan is het een weekend-klus en loopt hij op
 *    kalenderdagen door (het weekend telt dan mee), zodat hij op die weekenddag blijft staan i.p.v.
 *    naar maandag te springen.
 */
export function werkdagenVanaf(startIso: string, aantal: number): string[] {
  const n = Math.max(1, aantal || 1);
  const dag0 = startIso.split("T")[0];

  // Weekend-klus: kalenderdagen, weekend telt mee.
  if (!isWerkdag(dag0)) {
    return Array.from({ length: n }, (_, i) => verschuifDagen(dag0, i));
  }

  // Werkdag-klus: weekenden overslaan.
  const dagen: string[] = [];
  let kandidaat = dag0;
  let veiligheid = 0;
  while (dagen.length < n && veiligheid < n * 2 + 14) {
    if (isWerkdag(kandidaat)) dagen.push(kandidaat);
    kandidaat = verschuifDagen(kandidaat, 1);
    veiligheid++;
  }
  return dagen;
}

/** Maandag van de week waar deze datum in valt (zondag valt nog bij de week ervoor). */
export function maandagVan(iso: string): string {
  const d = parse(iso);
  const dow = d.getUTCDay(); // 0=zo, 1=ma, ... 6=za
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return format(d);
}

/**
 * De dagen vanaf een maandag: standaard de vijf werkdagen (ma t/m vr); met `metWeekend` ook za en zo
 * (ma t/m zo, zeven dagen) zodat het bord het weekend kan tonen.
 */
export function weekDagen(maandagIso: string, metWeekend: boolean = false): string[] {
  const lengte = metWeekend ? 7 : WERKDAGEN;
  return Array.from({ length: lengte }, (_, i) => verschuifDagen(maandagIso, i));
}

/** De 1e van de maand `maanden` verder (of terug bij negatief), als YYYY-MM-DD. Voor maand-navigatie. */
export function verschuifMaand(iso: string, maanden: number): string {
  const [y, m] = iso.split("T")[0].split("-").map(Number);
  return format(new Date(Date.UTC(y, m - 1 + maanden, 1)));
}

/**
 * De maandag van elke week die de maand van `iso` raakt (voor het maandoverzicht: vijf of zes
 * week-stroken onder elkaar). De eerste strook begint op de maandag vóór of op de 1e van de maand.
 */
export function maandWeken(iso: string): string[] {
  const eerste = verschuifMaand(iso, 0); // 1e van de maand
  const [y, m] = eerste.split("-").map(Number);
  const laatste = format(new Date(Date.UTC(y, m, 0))); // dag 0 van volgende maand = laatste dag van deze
  const eindMaandag = maandagVan(laatste);
  const weken: string[] = [];
  let ma = maandagVan(eerste);
  let veiligheid = 0;
  while (ma <= eindMaandag && veiligheid < 8) {
    weken.push(ma);
    ma = verschuifDagen(ma, 7);
    veiligheid++;
  }
  return weken;
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
  monteur_naam: string | null;
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

/** Een monteur-account als keuze/rij op het planbord. */
export interface MonteurOptie {
  id: string;
  naam: string;
}

export interface GeplaatsteKaart<T extends PlanbaarOpdracht = PlanbaarOpdracht> {
  plaatsing: PlanbordPlaatsing<T>;
  /** Sub-rij binnen de monteur-rij (0 = bovenste); voorkomt overlap bij gelijke dagen. */
  lane: number;
}

/**
 * Verdeelt de plaatsingen van één monteur over "lanes" (sub-rijen), zodat meerdaagse balken
 * kunnen uitrekken én elkaar niet overlappen: wat op dezelfde dag(en) valt komt onder elkaar.
 * Greedy interval-partitionering, gesorteerd op dag en daarna tijd. Pure functie.
 */
export function verdeelLanes<T extends PlanbaarOpdracht>(
  plaatsingen: PlanbordPlaatsing<T>[],
): GeplaatsteKaart<T>[] {
  const gesorteerd = [...plaatsingen].sort(
    (a, b) =>
      a.dagIndex - b.dagIndex ||
      (a.opdracht.starttijd ?? "").localeCompare(b.opdracht.starttijd ?? ""),
  );
  const laneEind: number[] = []; // exclusieve eind-kolom per lane
  const result: GeplaatsteKaart<T>[] = [];
  for (const p of gesorteerd) {
    let lane = laneEind.findIndex((eind) => eind <= p.dagIndex);
    if (lane === -1) {
      lane = laneEind.length;
      laneEind.push(0);
    }
    laneEind[lane] = p.dagIndex + p.span;
    result.push({ plaatsing: p, lane });
  }
  return result;
}

/** Minimale velden om dubbele boekingen te detecteren (een Melding voldoet hieraan). */
export interface BoekbaarOpdracht {
  id: string;
  toegewezen_aan: string | null;
  startdatum: string | null;
  starttijd: string | null;
  duur_dagen: number;
  dashboard_status: DashboardStatus;
}

/** De dagen die een opdracht bezet: montage = de werkdagen over de hele duur, service = alleen de startdag. */
function bezetteDagen(o: BoekbaarOpdracht): string[] {
  if (!o.startdatum) return [];
  const dag = o.startdatum.split("T")[0];
  if (o.starttijd) return [dag];
  return werkdagenVanaf(dag, Math.max(1, o.duur_dagen || 1));
}

/**
 * Vindt opdrachten die dubbel geboekt zijn: zelfde monteur (account) met overlappende dagen.
 * Twee montages of een montage en een service op dezelfde dag = conflict (montage vult de dag).
 * Twee services op dezelfde dag botsen alleen bij dezelfde starttijd. Pure functie.
 */
export function vindDubbeleBoekingen(opdrachten: BoekbaarOpdracht[]): Set<string> {
  const actief = opdrachten.filter(
    (o) => o.toegewezen_aan && o.startdatum && BOEKBAAR.has(o.dashboard_status),
  );
  const perMonteur = new Map<string, BoekbaarOpdracht[]>();
  for (const o of actief) {
    const k = o.toegewezen_aan as string;
    (perMonteur.get(k) ?? perMonteur.set(k, []).get(k)!).push(o);
  }
  const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
  const conflict = new Set<string>();
  for (const groep of perMonteur.values()) {
    for (let i = 0; i < groep.length; i++) {
      for (let j = i + 1; j < groep.length; j++) {
        const a = groep[i];
        const b = groep[j];
        const dagenA = bezetteDagen(a);
        const dagenB = bezetteDagen(b);
        if (!dagenA.some((d) => dagenB.includes(d))) continue;
        const beideService = !!a.starttijd && !!b.starttijd;
        const beideMontage = !a.starttijd && !b.starttijd;
        // Twee services op andere tijden: geen conflict.
        if (beideService && hhmm(a.starttijd) !== hhmm(b.starttijd)) continue;
        // Service (tijdstip) op dezelfde dag als montage: monteur plant dat bewust; geen conflict.
        if (!beideMontage && !beideService) continue;
        conflict.add(a.id);
        conflict.add(b.id);
      }
    }
  }
  return conflict;
}

/** Bovengrens voor een montage-duur, als veiligheidsklep tegen doorschieten bij het slepen. */
const MAX_DUUR_DAGEN = 20;

/**
 * Berekent de nieuwe duur (werkdagen) als je de rechterrand van een montage-balk versleept.
 * Elke dagkolom op het bord is één werkdag (weekends staan er niet, dus die worden vanzelf
 * overgeslagen): `deltaKolommen` is dus direct het aantal werkdagen dat erbij of eraf gaat.
 * Doorslepen voorbij vrijdag verlengt gewoon door; de balk loopt dan in de volgende week verder.
 * Inkorten kan tot er nog één kolom van de balk in deze week zichtbaar is (de balk mag niet uit
 * het zicht verdwijnen): de ondergrens is `huidigeDuur - (zichtbareSpan - 1)`, en nooit onder 1.
 * Pure functie, los te testen.
 */
export function nieuweDuurNaResize(
  huidigeDuur: number,
  zichtbareSpan: number,
  deltaKolommen: number,
  maxDuur: number = MAX_DUUR_DAGEN,
): number {
  const ondergrens = Math.max(1, huidigeDuur - (Math.max(1, zichtbareSpan) - 1));
  const gevraagd = huidigeDuur + deltaKolommen;
  return Math.min(maxDuur, Math.max(ondergrens, gevraagd));
}

/**
 * Nieuwe duur na een klik op de -/+ dagknop op een montage-balk: één werkdag erbij of eraf, minimaal 1
 * en met een veilige bovengrens. Loopt vanzelf door over de weekgrens (de weergave knipt op vrijdag en
 * toont de rest in de volgende week). Pure functie.
 */
export function duurNaStap(huidigeDuur: number, stap: number, maxDuur: number = MAX_DUUR_DAGEN): number {
  return Math.min(maxDuur, Math.max(1, huidigeDuur + stap));
}

/**
 * Of de getoonde week (vanaf `maandagIso`) een klus op zaterdag of zondag heeft. Zo ja, dan moet het
 * bord het weekend tonen, ook als de weekend-knop uit staat: anders zou die weekend-klus onzichtbaar
 * van het bord vallen. Telt alleen plaatsbare klussen (op-bord-status, monteur en startdatum). Pure functie.
 */
export function weekHeeftWeekendKlus<T extends PlanbaarOpdracht>(
  opdrachten: T[],
  maandagIso: string,
): boolean {
  const za = verschuifDagen(maandagIso, 5);
  const zo = verschuifDagen(maandagIso, 6);
  return opdrachten.some((o) => {
    if (!OP_BORD.has(o.dashboard_status) || !o.monteur_naam || !o.startdatum) return false;
    const dag = o.startdatum.split("T")[0];
    const dagen = o.starttijd ? [dag] : werkdagenVanaf(dag, o.duur_dagen);
    return dagen.includes(za) || dagen.includes(zo);
  });
}

/**
 * De startdatum na het een week verschuiven via de rand-strook: land net over de weekgrens, op de rand
 * van de doelweek die het dichtst bij ligt. Volgende week (`richting` > 0) -> de MAANDAG (begin van die
 * week). Vorige week (`richting` < 0) -> de LAATSTE getoonde dag: vrijdag als het weekend uit staat,
 * zondag als het weekend aan staat. `metWeekend` bepaalt dus alleen de vorige-week-landing. Pure functie.
 */
export function weekschuifLanding(iso: string, richting: number, metWeekend: boolean): string {
  if (richting > 0) return maandagVan(verschuifDagen(iso, 7));
  const maandagVorige = maandagVan(verschuifDagen(iso, -7));
  return verschuifDagen(maandagVorige, metWeekend ? 6 : 4); // zo (+6) of vr (+4)
}

/** Minimale velden om een opdracht op het planbord te kunnen zoeken (een Melding voldoet hieraan). */
export interface ZoekbaarOpdracht {
  id: string;
  klant_naam: string | null;
  klant_adres: string | null;
  referentienummer: string | null;
  monteur_naam: string | null;
  startdatum: string | null;
  dashboard_status: DashboardStatus;
}

/** Statussen die vindbaar zijn met de zoekfunctie: alles wat nog actief is (pool + op het bord). */
const VINDBAAR: ReadonlySet<DashboardStatus> = new Set<DashboardStatus>([
  "binnen",
  "concept_gepland",
  "gepland",
  "bevestigd",
]);

/**
 * Zoekt een opdracht over alle weken heen op klantnaam, referentienummer of adres (deel, hoofdletter-
 * ongevoelig). Zo vind je een klus terug die ver weg gepland staat, of nog in de pool zit. Opgeleverde
 * en geannuleerde klussen vallen weg. Gesorteerd op datum; klussen zonder datum (pool) komen achteraan.
 * Pure functie, los te testen. De UI berekent de week (maandagVan) en springt erheen.
 */
export function zoekPlanbord<T extends ZoekbaarOpdracht>(opdrachten: T[], zoekterm: string): T[] {
  const q = zoekterm.trim().toLowerCase();
  if (!q) return [];
  const treffers = opdrachten.filter((o) => {
    if (!VINDBAAR.has(o.dashboard_status)) return false;
    return [o.klant_naam, o.referentienummer, o.klant_adres].some(
      (v) => v != null && v.toLowerCase().includes(q),
    );
  });
  return treffers.sort((a, b) => {
    if (a.startdatum && b.startdatum) return a.startdatum.localeCompare(b.startdatum);
    if (a.startdatum) return -1; // a heeft een datum, b niet -> a eerst
    if (b.startdatum) return 1;
    return 0;
  });
}

/** Unieke, alfabetisch gesorteerde monteurs uit de geplande opdrachten (de rijen van het bord). */
export function monteurRijen(opdrachten: PlanbaarOpdracht[]): string[] {
  const set = new Set<string>();
  for (const o of opdrachten) {
    if (OP_BORD.has(o.dashboard_status) && o.monteur_naam) set.add(o.monteur_naam);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "nl"));
}

/**
 * Plaatst geplande opdrachten op het weekraster: bepaalt per opdracht de dagkolom en span.
 * Montage (geen starttijd) = dagblok over de werkdagen van zijn duur; het weekend wordt overgeslagen
 * en een blok dat over de weekgrens loopt verschijnt met de resterende dagen óók in de week(en) erna
 * (ma/di). Service (met starttijd) = kaartje van één kolom op de startdag. Opdrachten die deze week
 * niet raken of een niet-geplande status hebben, vallen weg. Pure functie, los te testen.
 */
export function plaatsOpdrachten<T extends PlanbaarOpdracht>(
  opdrachten: T[],
  weekDagenArr: string[],
): PlanbordPlaatsing<T>[] {
  const plaatsingen: PlanbordPlaatsing<T>[] = [];
  for (const o of opdrachten) {
    if (!OP_BORD.has(o.dashboard_status) || !o.monteur_naam || !o.startdatum) continue;
    const isService = o.starttijd != null && o.starttijd !== "";

    if (isService) {
      const dagIndex = weekDagenArr.indexOf(o.startdatum.split("T")[0]);
      if (dagIndex === -1) continue;
      plaatsingen.push({ opdracht: o, dagIndex, span: 1, isService: true });
      continue;
    }

    // Montage: de werkdagen die in déze week vallen vormen een aaneengesloten blok (ma..vr).
    const dagen = werkdagenVanaf(o.startdatum, o.duur_dagen).filter((d) => weekDagenArr.includes(d));
    if (dagen.length === 0) continue;
    const dagIndex = weekDagenArr.indexOf(dagen[0]);
    plaatsingen.push({ opdracht: o, dagIndex, span: dagen.length, isService: false });
  }
  return plaatsingen;
}
