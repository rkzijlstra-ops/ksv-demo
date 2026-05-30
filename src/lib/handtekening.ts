"use client";

/**
 * Zet een dataURL (zoals canvas.toDataURL("image/png") teruggeeft) om naar een Blob.
 * Pure functie (geen netwerk), zodat hij los te testen is.
 */
export function dataUrlNaarBlob(dataUrl: string): Blob {
  const komma = dataUrl.indexOf(",");
  if (komma === -1) throw new Error("Ongeldige dataURL");
  const kop = dataUrl.slice(0, komma);
  const base64 = dataUrl.slice(komma + 1);
  const mimeMatch = kop.match(/data:(.*?);base64/);
  const mime = mimeMatch && mimeMatch[1] ? mimeMatch[1] : "image/png";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Upload een handtekening-afbeelding via de bestaande foto-route (PNG is klein, mag via
 * de API-route). Geeft de publieke URL terug.
 */
export async function uploadHandtekening(blob: Blob): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("foto", blob, "handtekening.png");
  const res = await fetch("/api/upload-foto", { method: "POST", body: fd });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Handtekening uploaden mislukt (${res.status})`);
  return { url: body.url as string };
}
