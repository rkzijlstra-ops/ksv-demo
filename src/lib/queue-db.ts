import { openDB, type IDBPDatabase } from "idb";

/**
 * IndexedDB-schema voor de offline-wachtrij.
 *
 * - `melding_queue`: meldingen die de gebruiker offline heeft aangemaakt en die nog
 *   verstuurd moeten worden zodra er weer netwerk is.
 * - `foto_blobs`: foto-bestanden bij die meldingen, opgeslagen als Blob zodat ze
 *   bij sync via /api/upload-foto naar Supabase Storage geupload kunnen worden.
 */
export interface QueueMelding {
  id: string;
  opdracht_id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  /** Echte URLs van foto's die al online geupload waren (bv. eerdere sessie). */
  foto_urls: string[];
  /** Refs naar foto's die offline gemaakt zijn en nog in `foto_blobs` staan. */
  foto_local_ids: string[];
  status: "wachtend" | "bezig" | "mislukt";
  pogingen: number;
  laatste_fout?: string;
  /** ISO-string. */
  created_at: string;
}

export interface QueueFotoBlob {
  id: string;
  blob: Blob;
  content_type: string;
  bestandsnaam: string;
}

const DB_NAAM = "ksv-queue";
const DB_VERSIE = 1;

export async function openQueueDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAAM, DB_VERSIE, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("melding_queue")) {
        const store = db.createObjectStore("melding_queue", { keyPath: "id" });
        store.createIndex("status", "status");
        store.createIndex("created_at", "created_at");
        store.createIndex("spoed", "spoed");
      }
      if (!db.objectStoreNames.contains("foto_blobs")) {
        db.createObjectStore("foto_blobs", { keyPath: "id" });
      }
    },
  });
}
