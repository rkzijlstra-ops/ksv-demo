"use client";

import { createSupabaseBrowserClient } from "./supabase-browser";

const DOCUMENTEN_BUCKET = "opdracht-documenten";

export interface GeUploadDocument {
  naam: string;
  type: string;
  pad: string;
  publieke_url: string;
}

/**
 * Uploadt de gekozen bestanden RECHTSTREEKS vanuit de browser naar Supabase Storage via per-bestand een
 * signed upload-URL (server tekent met service-role). Zo gaan de zware bytes niet door de Vercel-functie
 * (payloadgrens ~4,5 MB) en treedt de 413 niet meer op. Geeft de opslagverwijzingen terug.
 */
export async function uploadDocumenten(
  files: File[],
  onVoortgang?: (gedaan: number, totaal: number) => void,
): Promise<GeUploadDocument[]> {
  const res = await fetch("/api/opdrachten/upload-urls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bestanden: files.map((f) => ({ naam: f.name, type: f.type, grootte: f.size })),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Upload voorbereiden mislukt (${res.status})`);
  const uploads = (body.uploads ?? []) as Array<{
    naam: string;
    type: string;
    pad: string;
    token: string;
    publieke_url: string;
  }>;

  const client = createSupabaseBrowserClient();
  const resultaat: GeUploadDocument[] = [];
  for (let i = 0; i < files.length; i++) {
    const u = uploads[i];
    const { error } = await client.storage
      .from(DOCUMENTEN_BUCKET)
      .uploadToSignedUrl(u.pad, u.token, files[i], { contentType: files[i].type || undefined });
    if (error) throw new Error(`Upload mislukt voor ${files[i].name}: ${error.message}`);
    resultaat.push({ naam: u.naam, type: u.type, pad: u.pad, publieke_url: u.publieke_url });
    onVoortgang?.(i + 1, files.length);
  }
  return resultaat;
}
