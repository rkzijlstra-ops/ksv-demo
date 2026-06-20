import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

const BUCKET = "meldingen-fotos";
const DOCUMENTEN_BUCKET = "opdracht-documenten";
const OPLEVER_VIDEO_BUCKET = "oplever-videos";

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
  /** Maakt een signed upload-URL zodat de browser het document rechtstreeks naar storage stuurt (buiten de
   *  Vercel-functie-grens om). Geeft pad + token + publieke URL terug. */
  signDocumentUpload(
    bestandsnaam: string,
    contentType: string,
  ): Promise<{ pad: string; token: string; publieke_url: string }>;
  /** Haalt een eerder geüpload document server-side op (voor het inlezen). */
  downloadDocument(pad: string): Promise<Buffer>;
  /** Verwijder een opdracht-document uit storage (best-effort opruiming na het wissen van de rij). */
  verwijderOpdrachtDocument(pad: string): Promise<void>;
  /** Verwijder een oplever-foto uit storage (bucket meldingen-fotos). */
  verwijderOpleverFoto(pad: string): Promise<void>;
  /** Verwijder een oplever-video uit storage (bucket oplever-videos). */
  verwijderOpleverVideo(pad: string): Promise<void>;
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

    async signDocumentUpload(bestandsnaam: string, contentType: string) {
      const ext = bepaalExtensie(bestandsnaam, contentType);
      const pad = `${crypto.randomUUID()}.${ext}`;
      const { data, error } = await client.storage
        .from(DOCUMENTEN_BUCKET)
        .createSignedUploadUrl(pad);
      if (error || !data) {
        throw new Error(`Upload-URL maken mislukt: ${error?.message ?? "geen data"}`);
      }
      const { data: pub } = client.storage.from(DOCUMENTEN_BUCKET).getPublicUrl(pad);
      return { pad, token: data.token, publieke_url: pub.publicUrl };
    },

    async downloadDocument(pad: string) {
      const { data, error } = await client.storage.from(DOCUMENTEN_BUCKET).download(pad);
      if (error || !data) {
        throw new Error(`Document downloaden mislukt: ${error?.message ?? "geen data"}`);
      }
      return Buffer.from(await data.arrayBuffer());
    },

    async verwijderOpdrachtDocument(pad: string) {
      const { error } = await client.storage.from(DOCUMENTEN_BUCKET).remove([pad]);
      if (error) throw new Error(`Document-verwijderen uit storage mislukt: ${error.message}`);
    },

    async verwijderOpleverFoto(pad: string) {
      const { error } = await client.storage.from(BUCKET).remove([pad]);
      if (error) throw new Error(`Oplever-foto verwijderen uit storage mislukt: ${error.message}`);
    },

    async verwijderOpleverVideo(pad: string) {
      const { error } = await client.storage.from(OPLEVER_VIDEO_BUCKET).remove([pad]);
      if (error) throw new Error(`Oplever-video verwijderen uit storage mislukt: ${error.message}`);
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
