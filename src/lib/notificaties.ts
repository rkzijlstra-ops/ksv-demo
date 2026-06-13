import { dbAdmin, type Profiel } from "./db";
import { getGebruikerEmail } from "./supabase-admin";
import { normaliseerNlMobiel } from "./telefoon";
import {
  verstuurAnnulering,
  verstuurOntplanning,
  verstuurMonteurMail,
  verstuurNieuwDocument,
  verstuurHerinnering,
} from "./mail";
import {
  annuleringSmsTekst,
  ontplanningSmsTekst,
  nieuweOpdrachtenSmsTekst,
  nieuwDocumentSmsTekst,
  herinneringSmsTekst,
} from "./sms-teksten";
import { verstuurSms } from "./sms";
import type { MailbareOpdracht } from "./monteur-mail";

export type SmsCategorie = "werk_kritiek" | "overig";

export interface NotificatieResultaat {
  gemaild: boolean;
  mailFout: string | null;
  gesmst: boolean;
  smsFout: string | null;
}

/** App-link voor in de SMS; leeg laten is prima, de tekstbouwer vangt dat op. */
function appUrl(): string {
  return process.env.APP_URL?.trim() ?? "";
}

/** Afzendernaam voor de SMS: de zaaknaam (max 11 tekens alfanumeriek), met env-fallback. */
function smsAfzender(zaaknaam: string | null): string {
  const basis = (zaaknaam ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return basis || process.env.SMS_AFZENDER?.trim() || "Kluslus";
}

/**
 * Bepaalt het SMS-bestemmingsnummer voor een monteur, of null als er geen SMS hoort te gaan
 * (categorie uit, of geen geldig mobiel nummer). Puur: het profiel wordt meegegeven.
 */
export function smsBestemming(
  profiel: Pick<Profiel, "telefoon" | "sms_werk_kritiek" | "sms_overig"> | null,
  categorie: SmsCategorie,
): string | null {
  if (!profiel) return null;
  const aan = categorie === "werk_kritiek" ? profiel.sms_werk_kritiek : profiel.sms_overig;
  if (!aan) return null;
  return normaliseerNlMobiel(profiel.telefoon);
}

/** Mail + (optioneel) SMS, allebei best-effort. Verzamelt het resultaat per kanaal. */
async function vuurAf(
  toegewezenAan: string | null,
  categorie: SmsCategorie,
  zaaknaam: string | null,
  mailFn: (naar: string) => Promise<void>,
  smsTekst: string,
): Promise<NotificatieResultaat> {
  const r: NotificatieResultaat = { gemaild: false, mailFout: null, gesmst: false, smsFout: null };

  const email =
    (toegewezenAan ? await getGebruikerEmail(toegewezenAan) : null) ??
    process.env.RAPPORT_EMAIL?.trim() ??
    null;
  if (email) {
    try {
      await mailFn(email);
      r.gemaild = true;
    } catch (err) {
      r.mailFout = (err as Error).message;
    }
  }

  if (toegewezenAan) {
    const profiel = await dbAdmin().getProfiel(toegewezenAan);
    const nummer = smsBestemming(profiel, categorie);
    if (nummer) {
      try {
        await verstuurSms({ naar: nummer, tekst: smsTekst, afzender: smsAfzender(zaaknaam) });
        r.gesmst = true;
      } catch (err) {
        r.smsFout = (err as Error).message;
      }
    }
  }
  return r;
}

export function notificeerNieuweOpdrachten(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  opdrachten: MailbareOpdracht[];
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurMonteurMail({
        naar,
        monteurNaam: input.monteurNaam,
        opdrachten: input.opdrachten,
        zaaknaam: input.zaaknaam ?? undefined,
      }),
    nieuweOpdrachtenSmsTekst(input.monteurNaam, input.opdrachten, appUrl()),
  );
}

export function notificeerAnnulering(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurAnnulering({
        naar,
        monteurNaam: input.monteurNaam,
        klantNaam: input.klantNaam,
        referentienummer: input.referentienummer,
        organisatie: input.zaaknaam ?? undefined,
      }),
    annuleringSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer, appUrl()),
  );
}

export function notificeerOntplanning(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "werk_kritiek",
    input.zaaknaam,
    (naar) =>
      verstuurOntplanning({
        naar,
        monteurNaam: input.monteurNaam,
        klantNaam: input.klantNaam,
        referentienummer: input.referentienummer,
        organisatie: input.zaaknaam ?? undefined,
      }),
    ontplanningSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer),
  );
}

export function notificeerNieuwDocument(input: {
  toegewezenAan: string | null;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "overig",
    input.zaaknaam,
    (naar) =>
      verstuurNieuwDocument({
        naar,
        monteurNaam: input.monteurNaam,
        klantNaam: input.klantNaam,
        referentienummer: input.referentienummer,
        organisatie: input.zaaknaam ?? undefined,
      }),
    nieuwDocumentSmsTekst(input.monteurNaam, input.klantNaam, input.referentienummer, appUrl()),
  );
}

export function notificeerHerinnering(input: {
  toegewezenAan: string;
  monteurNaam: string;
  klantNamen: string[];
  zaaknaam: string | null;
}): Promise<NotificatieResultaat> {
  return vuurAf(
    input.toegewezenAan,
    "overig",
    input.zaaknaam,
    (naar) =>
      verstuurHerinnering({
        naar,
        monteurNaam: input.monteurNaam,
        klantNamen: input.klantNamen,
        organisatie: input.zaaknaam ?? undefined,
      }),
    herinneringSmsTekst(input.monteurNaam, input.klantNamen, appUrl()),
  );
}
