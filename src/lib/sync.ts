import {
  haalQueueOp,
  leesFotoBlob,
  markeerStatus,
  verwijderUitQueue,
} from "./queue";
import type { QueueMelding } from "./queue-db";
import { publishSyncBezig } from "./sync-state";

const MAX_POGINGEN = 3;

export interface SyncResultaat {
  geprobeerd: number;
  geslaagd: number;
  mislukt: number;
}

/**
 * Loopt door de queue en probeert elk wachtend item te versturen.
 * - Spoed-first, dan FIFO (volgorde geleverd door haalQueueOp).
 * - Per item: upload eerst alle lokale foto-blobs (via /api/upload-foto), POST
 *   daarna de melding (via /api/meldingen).
 * - Bij succes: verwijder uit queue + bijbehorende foto-blobs.
 * - Bij failure: increment pogingen, status = "mislukt" zodra MAX_POGINGEN bereikt.
 *
 * `fetchImpl` is injecteerbaar zodat tests een mock-fetch kunnen meegeven.
 */
export async function syncQueue(
  fetchImpl: typeof fetch = fetch,
): Promise<SyncResultaat> {
  const items = await haalQueueOp();
  const wachtend = items.filter((m) => m.status === "wachtend" || m.status === "mislukt");

  const resultaat: SyncResultaat = { geprobeerd: 0, geslaagd: 0, mislukt: 0 };

  if (wachtend.length === 0) return resultaat;
  publishSyncBezig(true);
  try {
  for (const item of wachtend) {
    if (item.pogingen >= MAX_POGINGEN) continue;
    resultaat.geprobeerd += 1;
    await markeerStatus(item.id, "bezig");
    const ok = await verstuurEenItem(item, fetchImpl);
    if (ok) {
      await verwijderUitQueue(item.id);
      resultaat.geslaagd += 1;
    } else {
      const nieuwePogingen = item.pogingen + 1;
      const nieuwStatus = nieuwePogingen >= MAX_POGINGEN ? "mislukt" : "wachtend";
      await markeerStatus(item.id, nieuwStatus, {
        pogingen: nieuwePogingen,
        laatste_fout: "Versturen mislukt",
      });
      resultaat.mislukt += 1;
    }
  }
  } finally {
    publishSyncBezig(false);
  }

  return resultaat;
}

async function verstuurEenItem(
  item: QueueMelding,
  fetchImpl: typeof fetch,
): Promise<boolean> {
  try {
    // 1. Upload lokale foto-blobs naar Supabase Storage.
    const geuploade: string[] = [];
    for (const lokaalId of item.foto_local_ids) {
      const blob = await leesFotoBlob(lokaalId);
      if (!blob) continue; // blob is weg (handmatig verwijderd?), skip
      const fd = new FormData();
      fd.append("foto", blob.blob, blob.bestandsnaam);
      const res = await fetchImpl("/api/upload-foto", { method: "POST", body: fd });
      if (!res.ok) return false;
      const body = (await res.json().catch(() => ({}))) as { url?: string };
      if (!body.url) return false;
      geuploade.push(body.url);
    }

    const alleUrls = [...item.foto_urls, ...geuploade];

    // 2. POST de melding naar /api/meldingen.
    const res = await fetchImpl("/api/meldingen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        opdracht_id: item.opdracht_id,
        spoed: item.spoed,
        ruwe_tekst: item.ruwe_tekst,
        foto_urls: alleUrls,
      }),
    });
    if (!res.ok) return false;

    // 3. Spoed-mail buiten scope van I+J: zou volgen via een aparte sync-stap of
    //    handmatig op opdracht-detail. Voor MVP slaan we 'm over zodat melding
    //    in elk geval landt; gebruiker kan op opdracht-detail handmatig spoed
    //    versturen als nodig.
    return true;
  } catch {
    return false;
  }
}
