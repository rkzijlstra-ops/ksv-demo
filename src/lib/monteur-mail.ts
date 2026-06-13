import { formatDatumKort } from "./datum";
import { duurLabel } from "./opdracht-weergave";
import type { Melding } from "./db";

/** Velden die de monteur-mail van een opdracht gebruikt (een Melding voldoet hieraan). */
export type MailbareOpdracht = Pick<
  Melding,
  | "klant_naam"
  | "klant_adres"
  | "referentienummer"
  | "documenttype"
  | "startdatum"
  | "starttijd"
  | "duur_dagen"
  | "meldingen"
> & {
  /** Eerdere bezoeken aan dezelfde keuken (zelfde referentie), met rapport-link voor de monteur. */
  historie?: KeukenHistorieItem[];
  /** True als dit een verzetting is (al verstuurd aan dezelfde monteur, nu andere datum/tijd). */
  verzet?: boolean;
};

/** Eén eerder bezoek aan dezelfde keuken, zoals meegestuurd in de monteur-mail. */
export interface KeukenHistorieItem {
  datum: string | null;
  rapportUrl: string;
  monteurNaam: string | null;
}

/** Minimale opdracht-velden die nodig zijn om de keukenhistorie voor de mail op te bouwen. */
type HistorieBron = {
  id: string;
  opgeleverd_at: string | null;
  startdatum: string | null;
  rapport_url: string | null;
  monteur_naam: string | null;
};

/**
 * Bouwt de lijst eerdere bezoeken voor de monteur-mail uit opdrachten met dezelfde referentie:
 * alleen opgeleverde klussen met een rapport, de huidige opdracht zelf uitgesloten.
 */
export function historieVoorMonteur(rijen: HistorieBron[], huidigeId: string): KeukenHistorieItem[] {
  return rijen
    .filter((r) => r.id !== huidigeId && r.rapport_url)
    .map((r) => ({
      datum: r.opgeleverd_at ?? r.startdatum,
      rapportUrl: r.rapport_url as string,
      monteurNaam: r.monteur_naam,
    }));
}

function typeLabel(documenttype: Melding["documenttype"]): string | null {
  if (documenttype === "orderbevestiging") return "Montage";
  if (documenttype === "werkbon_service") return "Service";
  return null;
}

function opdrachtBlok(o: MailbareOpdracht): string {
  const regels: string[] = [`Klant: ${o.klant_naam ?? "onbekend"}`];
  if (o.referentienummer) regels.push(`Referentie: ${o.referentienummer}`);
  if (o.klant_adres) regels.push(`Adres: ${o.klant_adres}`);
  const type = typeLabel(o.documenttype);
  if (type) regels.push(`Type: ${type}`);
  if (o.startdatum) {
    regels.push(
      o.starttijd
        ? `Wanneer: ${formatDatumKort(o.startdatum)} om ${o.starttijd.slice(0, 5)}`
        : `Wanneer: vanaf ${formatDatumKort(o.startdatum)} (${duurLabel(o.duur_dagen)})`,
    );
  }
  const meldingTekst = (o.meldingen ?? [])
    .map((m) => m.melding_tekst)
    .filter(Boolean)
    .join("; ");
  if (meldingTekst) regels.push(`Melding: ${meldingTekst}`);

  if (o.historie && o.historie.length > 0) {
    regels.push("", `Deze keuken is eerder bezocht (${o.historie.length}x):`);
    for (const h of o.historie) {
      const datum = h.datum ? formatDatumKort(h.datum) : "eerder";
      const wie = h.monteurNaam ? ` (${h.monteurNaam})` : "";
      regels.push(`- ${datum}${wie}, rapport: ${h.rapportUrl}`);
    }
  }
  return regels.join("\n");
}

/**
 * Bouwt onderwerp en tekst van de mail naar een monteur met één of meer opdrachten.
 * Pure functie, los te testen; het echte versturen zit in mail.ts (Resend).
 */
export function monteurMailTekst(
  monteurNaam: string,
  opdrachten: MailbareOpdracht[],
  zaaknaam = "",
): { subject: string; text: string } {
  const n = opdrachten.length;
  // Eén opdracht die een verzetting is, krijgt een wijzig-toon i.p.v. "nieuwe opdracht". Bij een bundel
  // dekt de neutrale meervoudstekst zowel nieuwe als gewijzigde klussen.
  const verzet = n === 1 && !!opdrachten[0].verzet;
  const klant1 = opdrachten[0]?.klant_naam ?? "opdracht";
  const subject = verzet
    ? `Gewijzigde afspraak voor ${monteurNaam}: ${klant1}`
    : n === 1
      ? `Klus voor ${monteurNaam}: ${klant1}`
      : `${n} klussen voor ${monteurNaam}`;
  const intro = verzet
    ? `Hoi ${monteurNaam},\n\nEen afspraak is gewijzigd. Let op de nieuwe datum:`
    : n === 1
      ? `Hoi ${monteurNaam},\n\nEr staat een klus voor je klaar:`
      : `Hoi ${monteurNaam},\n\nEr staan ${n} klussen voor je klaar:`;
  const blokken = opdrachten.map(opdrachtBlok).join("\n\n----------------\n\n");
  const afzender = zaaknaam.trim() || "Het planning-team";
  const text = `${intro}\n\n${blokken}\n\nBevestig de ontvangst in de app.\n\n${afzender}`;
  return { subject, text };
}
