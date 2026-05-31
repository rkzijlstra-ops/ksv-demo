import { Resend } from "resend";
import type { Melding } from "./db";

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

function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY ontbreekt. Vul hem in .env.local in (zie .env.example) en herstart de dev-server.",
    );
  }
  const from = process.env.RESEND_FROM?.trim() || "onboarding@resend.dev";
  return { apiKey, from };
}

/**
 * Verstuurt het opleverrapport-PDF als e-mailbijlage via Resend.
 * Resend zit hier expres achter één functie zodat een latere provider-wissel alleen dit bestand raakt.
 */
export async function verstuurOpleverRapport(input: OpleverMailInput): Promise<void> {
  const { apiKey, from } = mailConfig();
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
 * Verstuurt een losse SPOED-melding direct naar kantoor (geen PDF, korte tekst-mail).
 * Wordt gebruikt als de monteur een melding als spoed markeert; de melding komt later ook in het rapport.
 */
export async function verstuurSpoedMelding(input: SpoedMailInput): Promise<void> {
  const { apiKey, from } = mailConfig();
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
    subject: `SPOED - ${klant}${ref}`,
    text: `SPOED-melding voor ${klant}${ref}.\n\n${tekst}${fotoRegels}\n\nDeze melding is als spoed verstuurd, los van de oplevering.\n\nKeukenstudio Voorschoten`,
  });

  if (error) {
    const msg = typeof error === "object" && error && "message" in error
      ? (error as { message: string }).message
      : JSON.stringify(error);
    throw new Error(`Spoed-mail versturen mislukt: ${msg}`);
  }
}
