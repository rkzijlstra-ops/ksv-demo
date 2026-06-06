import { Resend } from "resend";
import type { Melding, Rol } from "./db";
import { monteurMailTekst, type MailbareOpdracht } from "./monteur-mail";
import { uitnodigingTekst } from "./uitnodig-mail";
import { afmeldingTekst } from "./afmeld-mail";
import { annuleringTekst } from "./annuleer-mail";

export interface OpleverMailInput {
  naar: string;
  opdracht: Melding;
  pdf: Uint8Array;
  bestandsnaam: string;
  /** Optionele link naar de oplever-video (past niet in de PDF, gaat als link mee). */
  videoUrl?: string | null;
  /** Optionele notitie/bijzonderheden van de monteur bij de oplevering. */
  opmerking?: string | null;
}

export interface SpoedMailInput {
  naar: string;
  opdracht: Melding;
  melding: Melding;
}

export interface MonteurMailInput {
  naar: string;
  monteurNaam: string;
  opdrachten: MailbareOpdracht[];
  /** Naam van de zaak namens wie de opdracht gaat; wordt de afsluiter van de mail. */
  zaaknaam?: string;
}

export interface UitnodigingMailInput {
  naar: string;
  naam: string;
  rol: Rol;
  appUrl: string;
  /** Naam van de keukenzaak namens wie de uitnodiging gaat; wordt de afsluiter van de mail. */
  organisatie?: string;
}

export interface AfmeldingMailInput {
  naar: string;
  naam: string;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

export interface AnnuleringMailInput {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY ontbreekt. Vul hem in .env.local in (zie .env.example) en herstart de dev-server.",
    );
  }
  const from = process.env.RESEND_FROM?.trim() || "onboarding@resend.dev";
  // Optioneel: antwoorden op de app-mails komen op dit adres binnen (bv. je eigen Gmail).
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;
  return { apiKey, from, replyTo };
}

/**
 * Verstuurt het opleverrapport-PDF als e-mailbijlage via Resend.
 * Resend zit hier expres achter één functie zodat een latere provider-wissel alleen dit bestand raakt.
 */
export async function verstuurOpleverRapport(input: OpleverMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);

  const klant = input.opdracht.klant_naam ?? "opdracht";
  const ref = input.opdracht.referentienummer ? ` (ref ${input.opdracht.referentienummer})` : "";
  const zaaknaam = input.opdracht.keukenzaak?.trim() || "uw keukenzaak";
  const videoRegel = input.videoUrl ? `\n\nVideo van de oplevering:\n${input.videoUrl}` : "";
  const opmerkingRegel = input.opmerking?.trim()
    ? `\n\nOpmerking:\n${input.opmerking.trim()}`
    : "";

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject: `Opleverrapport ${klant}${ref}`,
    text: `In de bijlage het opleverrapport voor ${klant}${ref}.${opmerkingRegel}${videoRegel}\n\n${zaaknaam}`,
    attachments: [{ filename: input.bestandsnaam, content: Buffer.from(input.pdf) }],
  });

  if (error) {
    const msg = typeof error === "object" && error && "message" in error
      ? (error as { message: string }).message
      : JSON.stringify(error);
    throw new Error(`Mail versturen mislukt: ${msg}`);
  }
}

/**
 * Verstuurt een opdracht-melding naar een monteur (één of meer opdrachten, gebundeld).
 * De ontvanger (`naar`) is in de demo het geconfigureerde adres; later het adres van de monteur.
 */
export async function verstuurMonteurMail(input: MonteurMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = monteurMailTekst(input.monteurNaam, input.opdrachten, input.zaaknaam);

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  });
  if (error) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`Monteur-mail versturen mislukt: ${msg}`);
  }
}

/** Verstuurt een uitnodiging aan een nieuwe gebruiker (monteur/opdrachtgever) via Resend. */
export async function verstuurUitnodiging(input: UitnodigingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = uitnodigingTekst(input.naam, input.rol, input.appUrl, input.organisatie);

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  });
  if (error) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`Uitnodiging versturen mislukt: ${msg}`);
  }
}

/** Meldt een gebruiker netjes af: hij is uit de planning-app verwijderd. */
export async function verstuurAfmelding(input: AfmeldingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = afmeldingTekst(input.naam, input.organisatie);

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  });
  if (error) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`Afmelding versturen mislukt: ${msg}`);
  }
}

/** Meldt de monteur dat zijn toegewezen opdracht is geannuleerd. */
export async function verstuurAnnulering(input: AnnuleringMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = annuleringTekst(
    input.monteurNaam,
    input.klantNaam,
    input.referentienummer,
    input.organisatie,
  );

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
  });
  if (error) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`Annulering versturen mislukt: ${msg}`);
  }
}

/**
 * Verstuurt een losse SPOED-melding direct naar kantoor (geen PDF, korte tekst-mail).
 * Wordt gebruikt als de monteur een melding als spoed markeert; de melding komt later ook in het rapport.
 */
export async function verstuurSpoedMelding(input: SpoedMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);

  const klant = input.opdracht.klant_naam ?? "opdracht";
  const ref = input.opdracht.referentienummer ? ` (ref ${input.opdracht.referentienummer})` : "";
  const fotoRegels =
    input.melding.foto_urls.length > 0
      ? `\n\nFoto's:\n${input.melding.foto_urls.join("\n")}`
      : "";
  const tekst = input.melding.ruwe_tekst?.trim() || "(geen tekst)";

  const { error } = await resend.emails.send({
    from,
    to: input.naar,
    ...(replyTo ? { replyTo } : {}),
    subject: `SPOED - ${klant}${ref}`,
    text: `SPOED-melding voor ${klant}${ref}.\n\n${tekst}${fotoRegels}\n\nDeze melding is als spoed verstuurd, los van de oplevering.\n\n${input.opdracht.keukenzaak?.trim() || "Het planning-team"}`,
  });

  if (error) {
    const msg = typeof error === "object" && error && "message" in error
      ? (error as { message: string }).message
      : JSON.stringify(error);
    throw new Error(`Spoed-mail versturen mislukt: ${msg}`);
  }
}
