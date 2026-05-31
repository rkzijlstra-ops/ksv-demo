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

/** Bouwt de Supabase Storage upload-URL voor een bucket + pad. Pure functie. */
export function storageUploadUrl(supabaseUrl: string, bucket: string, pad: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${pad}`;
}

/**
 * Upload een video rechtstreeks vanuit de browser naar Supabase Storage (bucket
 * 'oplever-videos') via XHR, zodat we echte upload-voortgang kunnen tonen. Bewust niet via
 * een Next-API-route: video's zijn te groot voor de Vercel-functie-payload.
 */
export async function uploadOpleverVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string }> {
  const client = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const token = session?.access_token ?? apikey;

  const pad = videoOpslagPad(crypto.randomUUID(), file.name, file.type);
  const uploadUrl = storageUploadUrl(supabaseUrl, VIDEO_BUCKET, pad);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "video/mp4");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Video-upload mislukt (${xhr.status}): ${xhr.responseText || "geen details"}`));
    };
    xhr.onerror = () => reject(new Error("Netwerkfout bij video-upload"));
    xhr.send(file);
  });

  const { data } = client.storage.from(VIDEO_BUCKET).getPublicUrl(pad);
  return { url: data.publicUrl };
}
