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
  versie: number;
  // sessie 2A.6
  documenttype: "orderbevestiging" | "werkbon_service" | "tekst" | "onbekend" | null;
  leverweek: string | null;
  opdracht_status: "open" | "opgeleverd";
  opgeleverd_at: string | null;
  rapport_url: string | null;
}

/** Eén rij uit de documenten-tabel (origineel document bij een opdracht). */
export interface Document {
  id: string;
  created_at: string;
  opdracht_id: string;
  type: "pdf" | "afbeelding";
  bestandsnaam: string;
  storage_pad: string;
  publieke_url: string;
  referentienummer: string | null;
  is_primair: boolean;
}

/** Input voor een nieuwe opdracht (top-level rij). Dekt zowel uit-PDF als tekst-only. */
export interface OpdrachtInput {
  documenttype: "orderbevestiging" | "werkbon_service" | "onbekend" | "tekst";
  klant_naam: string | null;
  klant_adres: string | null;
  referentienummer: string | null;
  adviseur: string | null;
  klant_telefoon: string | null;
  leverweek: string | null;
  meldingen?: MeldingItem[];
  // TOEKOMSTVAST (sessie 2A.5 auth): nu altijd null.
  user_id?: string | null;
  toegewezen_aan?: string | null;
}

export interface DocumentInput {
  opdracht_id: string;
  type: "pdf" | "afbeelding";
  bestandsnaam: string;
  storage_pad: string;
  publieke_url: string;
  referentienummer: string | null;
  is_primair: boolean;
}

export interface MonteurMeldingInput {
  opdracht_id: string;
  urgentie: "rood" | "geel";
  ruwe_tekst: string | null;
  spraak_tekst: string | null;
  foto_urls: string[];
  status?: "concept" | "verzonden";
}

export interface UpdateMeldingInput {
  urgentie: "rood" | "geel";
  ruwe_tekst: string | null;
  foto_urls: string[];
  status: "concept" | "verzonden";
  /** Nieuwe versie (huidige + 1), berekend door de aanroeper. */
  versie: number;
}

export interface Db {
  insertPdfMelding(data: ParsedPdf): Promise<{ id: string }>;
  /** Maakt een top-level opdracht (uit geparsde PDF of handmatige tekst). */
  createOpdracht(input: OpdrachtInput): Promise<{ id: string }>;
  /** Voegt een origineel document toe aan een opdracht. */
  addDocument(input: DocumentInput): Promise<{ id: string }>;
  /** Documenten bij één opdracht (oudste eerst, primair doc als eerste aangemaakt). */
  getDocumentenVoorOpdracht(opdrachtId: string): Promise<Document[]>;
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
  /** Werkt een bestaande melding bij (bewerken + opnieuw verzenden). Hoogt versie op. */
  updateMelding(id: string, data: UpdateMeldingInput): Promise<void>;
  /** Markeert een opdracht als opgeleverd en koppelt het rapport-PDF. */
  markeerOpgeleverd(id: string, rapportUrl: string): Promise<void>;
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

    async createOpdracht(input: OpdrachtInput) {
      const { data: row, error } = await client
        .from("meldingen")
        .insert({
          bron: "pdf",
          documenttype: input.documenttype,
          klant_naam: input.klant_naam,
          klant_adres: input.klant_adres,
          referentienummer: input.referentienummer,
          adviseur: input.adviseur,
          klant_telefoon: input.klant_telefoon,
          leverweek: input.leverweek,
          meldingen: input.meldingen ?? [],
          user_id: input.user_id ?? null,
          toegewezen_aan: input.toegewezen_aan ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`DB insert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async addDocument(input: DocumentInput) {
      const { data: row, error } = await client
        .from("documenten")
        .insert({
          opdracht_id: input.opdracht_id,
          type: input.type,
          bestandsnaam: input.bestandsnaam,
          storage_pad: input.storage_pad,
          publieke_url: input.publieke_url,
          referentienummer: input.referentienummer,
          is_primair: input.is_primair,
        })
        .select("id")
        .single();
      if (error) throw new Error(`DB insert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async getDocumentenVoorOpdracht(opdrachtId: string) {
      const { data, error } = await client
        .from("documenten")
        .select("*")
        .eq("opdracht_id", opdrachtId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Document[];
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

    async updateMelding(id, data) {
      const patch: Record<string, unknown> = {
        urgentie: data.urgentie,
        ruwe_tekst: data.ruwe_tekst,
        foto_urls: data.foto_urls,
        status: data.status,
        versie: data.versie,
        aangepast: data.versie > 1,
      };
      if (data.status === "verzonden") {
        patch.verzonden_at = new Date().toISOString();
      }
      const { error } = await client.from("meldingen").update(patch).eq("id", id);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async markeerOpgeleverd(id, rapportUrl) {
      const { error } = await client
        .from("meldingen")
        .update({
          opdracht_status: "opgeleverd",
          opgeleverd_at: new Date().toISOString(),
          rapport_url: rapportUrl,
        })
        .eq("id", id);
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
