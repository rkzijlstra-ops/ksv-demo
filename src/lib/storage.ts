import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

const BUCKET = "meldingen-fotos";
const DOCUMENTEN_BUCKET = "opdracht-documenten";

export interface StorageConfig {
  url: string;
  secretKey: string;
}

export interface Storage {
  uploadFoto(data: Buffer, contentType: string): Promise<{ url: string }>;
  /** Upload een origineel opdracht-document (PDF of afbeelding). */
  uploadOpdrachtDocument(
    data: Buffer,
    bestandsnaam: string,
    contentType: string,
  ): Promise<{ pad: string; publieke_url: string }>;
}

/** Extensie afleiden uit bestandsnaam, met content-type als fallback. */
function bepaalExtensie(bestandsnaam: string, contentType: string): string {
  const uitNaam = bestandsnaam.includes(".")
    ? bestandsnaam.split(".").pop()!.toLowerCase()
    : "";
  if (uitNaam) return uitNaam;
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  return "bin";
}

export function createStorage(config: StorageConfig): Storage {
  const client: SupabaseClient = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async uploadFoto(data: Buffer, contentType: string) {
      const ext = contentType === "image/png" ? "png" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await client.storage.from(BUCKET).upload(path, data, {
        contentType,
        upsert: false,
      });
      if (error) throw new Error(`Foto-upload mislukt: ${error.message}`);
      const { data: pub } = client.storage.from(BUCKET).getPublicUrl(path);
      return { url: pub.publicUrl };
    },

    async uploadOpdrachtDocument(data: Buffer, bestandsnaam: string, contentType: string) {
      const ext = bepaalExtensie(bestandsnaam, contentType);
      const pad = `${crypto.randomUUID()}.${ext}`;
      const { error } = await client.storage.from(DOCUMENTEN_BUCKET).upload(pad, data, {
        contentType,
        upsert: false,
      });
      if (error) throw new Error(`Document-upload mislukt: ${error.message}`);
      const { data: pub } = client.storage.from(DOCUMENTEN_BUCKET).getPublicUrl(pad);
      return { pad, publieke_url: pub.publicUrl };
    },
  };
}

let cachedStorage: Storage | null = null;

export function storage(): Storage {
  if (!cachedStorage) {
    const e = env();
    cachedStorage = createStorage({ url: e.SUPABASE_URL, secretKey: e.SUPABASE_SECRET_KEY });
  }
  return cachedStorage;
}
