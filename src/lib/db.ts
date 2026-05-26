import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { ParsedPdf } from "./parser-schema";

export interface DbConfig {
  url: string;
  secretKey: string;
}

export interface Db {
  insertPdfMelding(data: ParsedPdf): Promise<{ id: string }>;
}

export function createDb(config: DbConfig): Db {
  const client: SupabaseClient = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async insertPdfMelding(data: ParsedPdf) {
      const { data: row, error } = await client
        .from("meldingen")
        .insert({ bron: "pdf", ...data })
        .select("id")
        .single();
      if (error) {
        throw new Error(`DB insert mislukt: ${error.message}`);
      }
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },
  };
}

let cachedDb: Db | null = null;

export function db(): Db {
  if (!cachedDb) {
    const e = env();
    cachedDb = createDb({ url: e.SUPABASE_URL, secretKey: e.SUPABASE_SECRET_KEY });
  }
  return cachedDb;
}
