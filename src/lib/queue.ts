import { openQueueDb, type QueueMelding, type QueueFotoBlob } from "./queue-db";
import { publishQueueGewijzigd } from "./sync-state";

/** Genereert een random UUID, fallback voor browsers zonder crypto.randomUUID. */
function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface NieuweQueueMeldingInput {
  opdracht_id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  foto_urls: string[];
  foto_local_ids: string[];
}

export async function voegToeAanQueue(input: NieuweQueueMeldingInput): Promise<string> {
  const db = await openQueueDb();
  const id = genId();
  const entry: QueueMelding = {
    id,
    opdracht_id: input.opdracht_id,
    spoed: input.spoed,
    ruwe_tekst: input.ruwe_tekst,
    foto_urls: input.foto_urls,
    foto_local_ids: input.foto_local_ids,
    status: "wachtend",
    pogingen: 0,
    created_at: new Date().toISOString(),
  };
  await db.put("melding_queue", entry);
  publishQueueGewijzigd();
  return id;
}

/** Alle queue-items, gesorteerd op `spoed desc, created_at asc` (sync-volgorde). */
export async function haalQueueOp(): Promise<QueueMelding[]> {
  const db = await openQueueDb();
  const alles = (await db.getAll("melding_queue")) as QueueMelding[];
  return alles.sort((a, b) => {
    if (a.spoed !== b.spoed) return a.spoed ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/** Queue-items die bij een specifieke opdracht horen (voor UI op opdracht-detail). */
export async function haalQueueVoorOpdracht(opdrachtId: string): Promise<QueueMelding[]> {
  const alles = await haalQueueOp();
  return alles.filter((m) => m.opdracht_id === opdrachtId);
}

export async function verwijderUitQueue(id: string): Promise<void> {
  const db = await openQueueDb();
  const entry = (await db.get("melding_queue", id)) as QueueMelding | undefined;
  if (!entry) return;
  // Eerst blobs verwijderen, dan de melding zelf.
  await Promise.all(entry.foto_local_ids.map((blobId) => db.delete("foto_blobs", blobId)));
  await db.delete("melding_queue", id);
  publishQueueGewijzigd();
}

export async function markeerStatus(
  id: string,
  status: QueueMelding["status"],
  opts: { pogingen?: number; laatste_fout?: string } = {},
): Promise<void> {
  const db = await openQueueDb();
  const entry = (await db.get("melding_queue", id)) as QueueMelding | undefined;
  if (!entry) return;
  entry.status = status;
  if (opts.pogingen !== undefined) entry.pogingen = opts.pogingen;
  if (opts.laatste_fout !== undefined) entry.laatste_fout = opts.laatste_fout;
  await db.put("melding_queue", entry);
  publishQueueGewijzigd();
}

export async function bewaarFotoBlob(blob: Blob, contentType: string, bestandsnaam: string): Promise<string> {
  const db = await openQueueDb();
  const id = genId();
  const entry: QueueFotoBlob = { id, blob, content_type: contentType, bestandsnaam };
  await db.put("foto_blobs", entry);
  return id;
}

export async function leesFotoBlob(id: string): Promise<QueueFotoBlob | undefined> {
  const db = await openQueueDb();
  return (await db.get("foto_blobs", id)) as QueueFotoBlob | undefined;
}

export async function aantalInQueue(): Promise<number> {
  const db = await openQueueDb();
  return await db.count("melding_queue");
}
