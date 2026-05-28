import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

const BUCKET = "meldingen-fotos";

export interface StorageConfig {
  url: string;
  secretKey: string;
}

export interface Storage {
  uploadFoto(data: Buffer, contentType: string): Promise<{ url: string }>;
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
