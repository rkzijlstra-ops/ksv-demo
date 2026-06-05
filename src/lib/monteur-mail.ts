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
>;

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
  const subject =
    n === 1
      ? `Opdracht voor ${monteurNaam}: ${opdrachten[0].klant_naam ?? "opdracht"}`
      : `${n} opdrachten voor ${monteurNaam}`;
  const intro =
    n === 1
      ? `Hoi ${monteurNaam},\n\nEr staat een opdracht voor je klaar:`
      : `Hoi ${monteurNaam},\n\nEr staan ${n} opdrachten voor je klaar:`;
  const blokken = opdrachten.map(opdrachtBlok).join("\n\n----------------\n\n");
  const afzender = zaaknaam.trim() || "Het planning-team";
  const text = `${intro}\n\n${blokken}\n\nBevestig de ontvangst in de app.\n\n${afzender}`;
  return { subject, text };
}
