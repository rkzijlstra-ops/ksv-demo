"use client";

import { createSupabaseBrowserClient } from "./supabase-browser";

const VIDEO_BUCKET = "oplever-videos";

/**
 * Bepaalt de bestandsextensie voor een video uit bestandsnaam, met content-type als fallback.
 * Pure functie (geen IO), zodat hij los te testen is.
 */
export function videoExtensie(bestandsnaam: string, contentType: string): string {
  const uitNaam = bestandsnaam.includes(".")
    ? bestandsnaam.split(".").pop()!.toLowerCase()
    : "";
  if (uitNaam) return uitNaam;
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("webm")) return "webm";
  return "mp4";
}

/** Bouwt het opslagpad (uuid + extensie). Pure functie. */
export function videoOpslagPad(uuid: string, bestandsnaam: string, contentType: string): string {
  return `${uuid}.${videoExtensie(bestandsnaam, contentType)}`;
}

/**
 * Upload een video rechtstreeks vanuit de browser naar Supabase Storage (bucket
 * 'oplever-videos'). Bewust niet via een Next-API-route: video's zijn te groot voor de
 * Vercel-functie-payload. Geeft de publieke URL terug.
 */
export async function uploadOpleverVideo(file: File): Promise<{ url: string }> {
  const client = createSupabaseBrowserClient();
  const pad = videoOpslagPad(crypto.randomUUID(), file.name, file.type);
  const { error } = await client.storage.from(VIDEO_BUCKET).upload(pad, file, {
    contentType: file.type || "video/mp4",
    upsert: false,
  });
  if (error) throw new Error(`Video-upload mislukt: ${error.message}`);
  const { data } = client.storage.from(VIDEO_BUCKET).getPublicUrl(pad);
  return { url: data.publicUrl };
}
