import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { ParsedPdf, MeldingItem } from "./parser-schema";

export interface DbConfig {
  url: string;
  secretKey: string;
}

/** Eén rij uit de meldingen-tabel. */
export interface Melding {
  id: string;
  created_at: string;
  bron: "pdf" | "monteur";
  urgentie: "rood" | "geel" | null;
  klant_naam: string | null;
  klant_adres: string | null;
  referentienummer: string | null;
  adviseur: string | null;
  klant_telefoon: string | null;
  meldingen: MeldingItem[];
  foto_urls: string[];
  spraak_tekst: string | null;
  ruwe_tekst: string | null;
  status: "concept" | "verzonden";
  aangepast: boolean;
  verzonden_at: string | null;
  uitvoerdatum: string | null;
  opdracht_id: string | null;
}

export interface MonteurMeldingInput {
  opdracht_id: string;
  urgentie: "rood" | "geel";
  ruwe_tekst: string | null;
  spraak_tekst: string | null;
  foto_urls: string[];
  status?: "concept" | "verzonden";
}

export interface Db {
  insertPdfMelding(data: ParsedPdf): Promise<{ id: string }>;
  /** Alleen opdrachten (top-level, opdracht_id IS NULL) voor de werkbak. */
  getMeldingen(): Promise<Melding[]>;
  getMeldingById(id: string): Promise<Melding | null>;
  /** Meldingen die bij één opdracht horen (nieuwste eerst). */
  getMeldingenVoorOpdracht(opdrachtId: string): Promise<Melding[]>;
  createMonteurMelding(data: MonteurMeldingInput): Promise<{ id: string }>;
  updateMeldingStatus(
    id: string,
    opts: { status: "concept" | "verzonden"; aangepast?: boolean },
  ): Promise<void>;
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
      if (error) throw new Error(`DB insert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async getMeldingen() {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .is("opdracht_id", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async getMeldingById(id: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data as Melding | null) ?? null;
    },

    async getMeldingenVoorOpdracht(opdrachtId: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("opdracht_id", opdrachtId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async createMonteurMelding(data: MonteurMeldingInput) {
      const { data: row, error } = await client
        .from("meldingen")
        .insert({
          bron: "monteur",
          opdracht_id: data.opdracht_id,
          status: data.status ?? "concept",
          urgentie: data.urgentie,
          ruwe_tekst: data.ruwe_tekst,
          spraak_tekst: data.spraak_tekst,
          foto_urls: data.foto_urls,
          meldingen: [],
        })
        .select("id")
        .single();
      if (error) throw new Error(`DB insert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async updateMeldingStatus(id, opts) {
      const patch: Record<string, unknown> = { status: opts.status };
      if (opts.status === "verzonden") {
        patch.verzonden_at = new Date().toISOString();
      }
      if (opts.aangepast !== undefined) {
        patch.aangepast = opts.aangepast;
      }
      const { error } = await client.from("meldingen").update(patch).eq("id", id);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
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
