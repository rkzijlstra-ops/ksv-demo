import { Resend } from "resend";
import { isDemoMode, leesAllowlist, ontvangerToegestaan } from "./demo";
import { logDemoBericht } from "./demo-log";
import type { Melding, Rol } from "./db";
import type { RapportAfzender } from "./afzender";
import { htmlVanTekst } from "./mail-html";
import { opleverMailTekst, afzenderHeader } from "./oplever-mail";
import { monteurMailTekst, type MailbareOpdracht } from "./monteur-mail";
import { uitnodigingTekst } from "./uitnodig-mail";
import { afmeldingTekst } from "./afmeld-mail";
import { annuleringTekst } from "./annuleer-mail";
import { ontplanningTekst } from "./ontplan-mail";
import { terugmeldingTekst } from "./terugmeld-mail";
import { afgerondMeldingTekst } from "./afgerond-mail";
import { nieuwDocumentTekst } from "./document-mail";
import { herinneringTekst } from "./herinnering-mail";

export interface OpleverMailInput {
  naar: string;
  opdracht: Melding;
  pdf: Uint8Array;
  bestandsnaam: string;
  /** Of er een oplever-video is. Bepaalt of de mailtekst de video noemt; de link zelf staat in de PDF. */
  videoUrl?: string | null;
  /** Afzender uit het monteur-profiel; bepaalt zowel de From-naam als de ondertekening. */
  afzender?: RapportAfzender | null;
  /** Voor wie de mail is. "zaak" (default) = kantoor; "klant" = de eindklant. */
  doelgroep?: "klant" | "zaak";
  /** Alleen zaak-mail: vermeld dat de klant zijn versie ook kreeg (al geformatteerde datum + adres). */
  klantOok?: { wanneer: string; adres: string } | null;
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

export interface OntplanningMailInput {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

export interface TerugmeldingMailInput {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  reden: string;
  toelichting: string | null;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

export interface NieuwDocumentMailInput {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

export interface HerinneringMailInput {
  naar: string;
  monteurNaam: string;
  klantNamen: string[];
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

type MailPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
};

/**
 * Eén doorvoer voor ALLE uitgaande mail: past de allowlist/fail-safe toe (demo-veiligheid) en stuurt
 * dan pas via Resend. Een geweigerde ontvanger wordt overgeslagen en gelogd; blijft er niemand over,
 * dan gaat er niets uit. Hier loopt later ook de demo-notificatielog langs.
 */
async function verzendMail(resend: Resend, payload: MailPayload, foutLabel: string): Promise<void> {
  const check = ontvangerToegestaan(payload.to, leesAllowlist(process.env.MAIL_ALLOWLIST), isDemoMode());
  if (!check.toegestaan) {
    console.log(`[mail overgeslagen] ${payload.to}: ${check.reden}`);
    await logDemoBericht({ kanaal: "mail", naar: payload.to, samenvatting: payload.subject, verstuurd: false, reden: check.reden });
    return;
  }
  await logDemoBericht({ kanaal: "mail", naar: payload.to, samenvatting: payload.subject, verstuurd: true });
  const { error } = await resend.emails.send({
    from: payload.from,
    to: payload.to,
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    subject: payload.subject,
    text: payload.text,
    ...(payload.html ? { html: payload.html } : {}),
    ...(payload.attachments ? { attachments: payload.attachments } : {}),
  });
  if (error) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : JSON.stringify(error);
    throw new Error(`${foutLabel}: ${msg}`);
  }
}

/**
 * Verstuurt het opleverrapport-PDF als e-mailbijlage via Resend.
 * Resend zit hier expres achter één functie zodat een latere provider-wissel alleen dit bestand raakt.
 */
export async function verstuurOpleverRapport(input: OpleverMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);

  const { subject, text, afzenderNaam } = opleverMailTekst({
    klantNaam: input.opdracht.klant_naam,
    referentienummer: input.opdracht.referentienummer,
    afzender: input.afzender ?? null,
    heeftVideo: !!input.videoUrl?.trim(),
    doelgroep: input.doelgroep ?? "zaak",
    klantOok: input.klantOok ?? null,
  });

  await verzendMail(
    resend,
    {
      from: afzenderHeader(from, afzenderNaam),
      to: input.naar,
      replyTo,
      subject,
      text,
      // Ook een HTML-versie meesturen: een mail met alleen platte tekst + PDF-bijlage scoort hoog op
      // spam (en gaf een lege preview). Multipart (text + html) haalt dat patroon weg.
      html: htmlVanTekst(text),
      attachments: [{ filename: input.bestandsnaam, content: Buffer.from(input.pdf) }],
    },
    "Mail versturen mislukt",
  );
}

/**
 * Verstuurt een opdracht-melding naar een monteur (één of meer opdrachten, gebundeld).
 * De ontvanger (`naar`) is in de demo het geconfigureerde adres; later het adres van de monteur.
 */
export async function verstuurMonteurMail(input: MonteurMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = monteurMailTekst(input.monteurNaam, input.opdrachten, input.zaaknaam);

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Monteur-mail versturen mislukt",
  );
}

/** Verstuurt een uitnodiging aan een nieuwe gebruiker (monteur/opdrachtgever) via Resend. */
export async function verstuurUitnodiging(input: UitnodigingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = uitnodigingTekst(input.naam, input.rol, input.appUrl, input.organisatie);

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Uitnodiging versturen mislukt",
  );
}

/** Meldt een gebruiker netjes af: hij is uit de planning-app verwijderd. */
export async function verstuurAfmelding(input: AfmeldingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = afmeldingTekst(input.naam, input.organisatie);

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Afmelding versturen mislukt",
  );
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

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Annulering versturen mislukt",
  );
}

/** Meldt de monteur dat zijn toegewezen opdracht van de planning is gehaald (terug naar de pool). */
export async function verstuurOntplanning(input: OntplanningMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = ontplanningTekst(
    input.monteurNaam,
    input.klantNaam,
    input.referentienummer,
    input.organisatie,
  );

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Ontplan-mail versturen mislukt",
  );
}

/** Meldt de monteur dat er een nieuw document bij zijn al verstuurde opdracht is gezet (geen herbevestiging). */
export async function verstuurNieuwDocument(input: NieuwDocumentMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = nieuwDocumentTekst(
    input.monteurNaam,
    input.klantNaam,
    input.referentienummer,
    input.organisatie,
  );

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Document-mail versturen mislukt",
  );
}

/** Stuurt de monteur een bevestig-herinnering voor zijn nog niet bevestigde klussen (gebundeld). */
export async function verstuurHerinnering(input: HerinneringMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = herinneringTekst(input.monteurNaam, input.klantNamen, input.organisatie);

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Herinnering-mail versturen mislukt",
  );
}

/** Meldt kantoor dat de monteur een klus heeft teruggemeld (niet doorgegaan, met reden). */
export async function verstuurTerugmelding(input: TerugmeldingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = terugmeldingTekst(
    input.monteurNaam,
    input.klantNaam,
    input.referentienummer,
    input.reden,
    input.toelichting,
    input.organisatie,
  );

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Terugmeld-mail versturen mislukt",
  );
}

export interface AfgerondMeldingMailInput {
  naar: string;
  monteurNaam: string;
  klantNaam: string;
  referentienummer: string | null;
  toelichting: string | null;
  vervolgNodig: boolean;
  /** Naam van de keukenzaak; wordt de afsluiter van de mail. */
  organisatie?: string;
}

/** Meldt kantoor dat de monteur een klus snel als afgerond heeft gemeld (geen volledig rapport). */
export async function verstuurAfgerondMelding(opts: AfgerondMeldingMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);
  const { subject, text } = afgerondMeldingTekst(
    opts.monteurNaam,
    opts.klantNaam,
    opts.referentienummer,
    opts.toelichting,
    opts.vervolgNodig,
    opts.organisatie ?? "",
  );

  await verzendMail(
    resend,
    { from, to: opts.naar, replyTo, subject, text, html: htmlVanTekst(text) },
    "Afgerond-mail versturen mislukt",
  );
}

/**
 * Verstuurt een losse SPOED-melding direct naar kantoor (geen PDF, korte tekst-mail).
 * Wordt gebruikt als de monteur een melding als spoed markeert; de melding komt later ook in het rapport.
 */
export async function verstuurSpoedMelding(input: SpoedMailInput): Promise<void> {
  const { apiKey, from, replyTo } = mailConfig();
  const resend = new Resend(apiKey);

  const klant = input.opdracht.klant_naam ?? "klant";
  const ref = input.opdracht.referentienummer ? ` (ref ${input.opdracht.referentienummer})` : "";
  const fotoRegels =
    input.melding.foto_urls.length > 0
      ? `\n\nFoto's:\n${input.melding.foto_urls.join("\n")}`
      : "";
  const tekst = input.melding.ruwe_tekst?.trim() || "(geen tekst)";

  const spoedTekst = `SPOED-melding voor ${klant}${ref}.\n\n${tekst}${fotoRegels}\n\nDeze melding is als spoed verstuurd, los van de oplevering.\n\n${input.opdracht.keukenzaak?.trim() || "Het planning-team"}`;

  await verzendMail(
    resend,
    { from, to: input.naar, replyTo, subject: `SPOED - ${klant}${ref}`, text: spoedTekst, html: htmlVanTekst(spoedTekst) },
    "Spoed-mail versturen mislukt",
  );
}
