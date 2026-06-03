import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { createSupabaseServerClient } from "./supabase-server";
import { scopeVoorDashboard } from "./dashboard-scope";
import { moetOpnieuwVersturen } from "./opdracht-status";
import type { ParsedPdf, MeldingItem } from "./parser-schema";

export interface DbConfig {
  url: string;
  secretKey: string;
}

/**
 * Levenscyclus van een opdracht aan de opdrachtgeverskant (dashboard + planbord).
 * Los van de monteur-melding-status (concept/verzonden) en opdracht_status (open/opgeleverd).
 * Volgorde: binnen -> concept_gepland -> gepland -> bevestigd -> opgeleverd; geannuleerd is een zijtak.
 */
export type DashboardStatus =
  | "binnen"
  | "concept_gepland"
  | "gepland"
  | "bevestigd"
  | "opgeleverd"
  | "geannuleerd";

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
  keukenzaak: string | null;
  opdracht_status: "open" | "opgeleverd";
  opgeleverd_at: string | null;
  rapport_url: string | null;
  // sessie 2A.7 (spoed vervangt rood/geel-urgentie)
  spoed: boolean;
  spoed_verzonden_at: string | null;
  // v2: soft-delete (prullenbak)
  verwijderd_at: string | null;
  // compleet-systeem blok 0: opdrachtgeverskant (levenscyclus + planning)
  dashboard_status: DashboardStatus;
  startdatum: string | null;
  starttijd: string | null;
  duur_dagen: number;
  gewijzigd_te_versturen: boolean;
  bevestigd_at: string | null;
}

/** Eén rij uit de opleveringen-tabel (één per opdracht). */
export interface Oplevering {
  id: string;
  created_at: string;
  opdracht_id: string;
  uitkomst: "afgerond" | "openstaande_punten";
  eindstaat_foto_urls: string[];
  video_url: string | null;
  handtekening_url: string | null;
  opmerking: string | null;
  rapport_email: string | null;
  rapport_url: string | null;
  user_id: string | null;
}

/** Input voor het opslaan/bijwerken van een oplevering-concept. */
export interface OpleveringConceptInput {
  opdracht_id: string;
  uitkomst?: "afgerond" | "openstaande_punten";
  eindstaat_foto_urls: string[];
  video_url: string | null;
  /**
   * Weggelaten (undefined) = niet wijzigen, zodat een tussentijdse opslag de eerder gezette
   * handtekening niet per ongeluk wist. Expliciet null = wissen, een string = zetten.
   */
  handtekening_url?: string | null;
  opmerking?: string | null;
  rapport_email?: string | null;
  user_id?: string | null;
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
  keukenzaak?: string | null;
  meldingen?: MeldingItem[];
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
  user_id: string;
}

export interface MonteurMeldingInput {
  opdracht_id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  spraak_tekst: string | null;
  foto_urls: string[];
  status?: "concept" | "verzonden";
  user_id: string;
}

export interface UpdateMeldingInput {
  spoed: boolean;
  ruwe_tekst: string | null;
  foto_urls: string[];
  status: "concept" | "verzonden";
  versie: number;
}

/** Per opdracht: hoeveel meldingen en of er een spoed-melding bij zit (voor de werkpool). */
export type MeldingTellingen = Record<string, { aantal: number; heeftSpoed: boolean }>;

/** Planning-invoer voor een opdracht (één invoermodel: tijd leeg = dagblok, ingevuld = tijdkaart). */
export interface PlanningInput {
  toegewezen_aan?: string | null;
  startdatum: string;
  starttijd: string | null;
  duur_dagen: number;
}

export interface Db {
  insertPdfMelding(data: ParsedPdf): Promise<{ id: string }>;
  createOpdracht(input: OpdrachtInput): Promise<{ id: string }>;
  addDocument(input: DocumentInput): Promise<{ id: string }>;
  getDocumentenVoorOpdracht(opdrachtId: string): Promise<Document[]>;
  getMeldingen(): Promise<Melding[]>;
  getMeldingById(id: string): Promise<Melding | null>;
  getMeldingenVoorOpdracht(opdrachtId: string): Promise<Melding[]>;
  createMonteurMelding(data: MonteurMeldingInput): Promise<{ id: string }>;
  updateMeldingStatus(
    id: string,
    opts: { status: "concept" | "verzonden"; aangepast?: boolean },
  ): Promise<void>;
  updateMelding(id: string, data: UpdateMeldingInput): Promise<void>;
  markeerOpgeleverd(id: string, rapportUrl: string): Promise<void>;
  upsertOpleveringConcept(input: OpleveringConceptInput): Promise<{ id: string }>;
  getOpleveringVoorOpdracht(opdrachtId: string): Promise<Oplevering | null>;
  finaliseerOplevering(opdrachtId: string, rapportUrl: string): Promise<void>;
  verwijderOpdracht(id: string): Promise<void>;
  herstelOpdracht(id: string): Promise<void>;
  definitiefVerwijderen(id: string): Promise<void>;
  getVerwijderdeOpdrachten(): Promise<Melding[]>;
  verwijderDocument(id: string): Promise<void>;
  verwijderMelding(id: string): Promise<void>;
  markeerSpoedVerzonden(id: string): Promise<void>;
  getMeldingTellingen(): Promise<MeldingTellingen>;
  // compleet-systeem blok 0: dashboard/planning (opdrachtgeverskant)
  getOpdrachtenVoorDashboard(peildatum?: Date): Promise<Melding[]>;
  getOpdrachtById(id: string): Promise<Melding | null>;
  zoekOpReferentie(referentienummer: string): Promise<Melding[]>;
  planOpdracht(id: string, planning: PlanningInput): Promise<void>;
  verstuurNaarMonteurs(ids: string[]): Promise<void>;
  bevestigOntvangst(id: string): Promise<void>;
  wijzigOpdracht(
    id: string,
    planning: PlanningInput,
    huidigeStatus: DashboardStatus,
  ): Promise<void>;
  annuleerOpdracht(id: string): Promise<void>;
}

/**
 * Bouwt een Db-instantie boven een gegeven Supabase-client. De caller bepaalt of de
 * client onder de ingelogde user (RLS-respecterend) of onder service-role (admin) draait.
 */
function createDbFromClient(client: SupabaseClient): Db {
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
          keukenzaak: input.keukenzaak ?? null,
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
          user_id: input.user_id,
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
        .is("verwijderd_at", null)
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
          spoed: data.spoed,
          ruwe_tekst: data.ruwe_tekst,
          spraak_tekst: data.spraak_tekst,
          foto_urls: data.foto_urls,
          meldingen: [],
          user_id: data.user_id,
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
        spoed: data.spoed,
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

    async upsertOpleveringConcept(input) {
      const payload: Record<string, unknown> = {
        opdracht_id: input.opdracht_id,
        uitkomst: input.uitkomst ?? "afgerond",
        eindstaat_foto_urls: input.eindstaat_foto_urls,
        video_url: input.video_url,
        opmerking: input.opmerking ?? null,
        rapport_email: input.rapport_email ?? null,
        user_id: input.user_id ?? null,
      };
      // Alleen meeschrijven als de aanroeper de handtekening expliciet meegeeft (string of null).
      // Weggelaten = kolom ongemoeid laten, zodat een tussentijdse opslag de handtekening niet wist.
      if (input.handtekening_url !== undefined) {
        payload.handtekening_url = input.handtekening_url;
      }
      const { data: row, error } = await client
        .from("opleveringen")
        .upsert(payload, { onConflict: "opdracht_id" })
        .select("id")
        .single();
      if (error) throw new Error(`DB upsert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB upsert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async getOpleveringVoorOpdracht(opdrachtId) {
      const { data, error } = await client
        .from("opleveringen")
        .select("*")
        .eq("opdracht_id", opdrachtId)
        .maybeSingle();
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data as Oplevering | null) ?? null;
    },

    async finaliseerOplevering(opdrachtId, rapportUrl) {
      const { error } = await client
        .from("opleveringen")
        .update({ rapport_url: rapportUrl })
        .eq("opdracht_id", opdrachtId);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async verwijderOpdracht(id) {
      // Soft-delete: markeren als verwijderd (prullenbak), niet echt wissen.
      const { error } = await client
        .from("meldingen")
        .update({ verwijderd_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(`DB verwijderen mislukt: ${error.message}`);
    },

    async herstelOpdracht(id) {
      const { error } = await client
        .from("meldingen")
        .update({ verwijderd_at: null })
        .eq("id", id);
      if (error) throw new Error(`DB herstellen mislukt: ${error.message}`);
    },

    async definitiefVerwijderen(id) {
      const { error } = await client.from("meldingen").delete().eq("id", id);
      if (error) throw new Error(`DB definitief verwijderen mislukt: ${error.message}`);
    },

    async getVerwijderdeOpdrachten() {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .is("opdracht_id", null)
        .not("verwijderd_at", "is", null)
        .order("verwijderd_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async verwijderDocument(id) {
      const { error } = await client.from("documenten").delete().eq("id", id);
      if (error) throw new Error(`DB verwijderen mislukt: ${error.message}`);
    },

    async verwijderMelding(id) {
      const { error } = await client.from("meldingen").delete().eq("id", id);
      if (error) throw new Error(`DB verwijderen mislukt: ${error.message}`);
    },

    async markeerSpoedVerzonden(id) {
      const { error } = await client
        .from("meldingen")
        .update({ spoed_verzonden_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async getMeldingTellingen() {
      const { data, error } = await client
        .from("meldingen")
        .select("opdracht_id, spoed")
        .not("opdracht_id", "is", null);
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      const result: MeldingTellingen = {};
      for (const rij of (data ?? []) as { opdracht_id: string; spoed: boolean }[]) {
        const huidig = result[rij.opdracht_id] ?? { aantal: 0, heeftSpoed: false };
        huidig.aantal += 1;
        if (rij.spoed) huidig.heeftSpoed = true;
        result[rij.opdracht_id] = huidig;
      }
      return result;
    },

    async getOpdrachtenVoorDashboard(peildatum = new Date()) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .is("opdracht_id", null)
        .is("verwijderd_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return scopeVoorDashboard((data ?? []) as Melding[], peildatum);
    },

    async getOpdrachtById(id: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data as Melding | null) ?? null;
    },

    async zoekOpReferentie(referentienummer: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("referentienummer", referentienummer)
        .is("opdracht_id", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async planOpdracht(id, planning) {
      const patch: Record<string, unknown> = {
        startdatum: planning.startdatum,
        starttijd: planning.starttijd,
        duur_dagen: planning.duur_dagen,
        dashboard_status: "concept_gepland",
        // uitvoerdatum gelijkhouden aan startdatum: de monteur-werkpool leest die nog.
        uitvoerdatum: planning.startdatum,
      };
      if (planning.toegewezen_aan !== undefined) {
        patch.toegewezen_aan = planning.toegewezen_aan;
      }
      const { error } = await client.from("meldingen").update(patch).eq("id", id);
      if (error) throw new Error(`DB plannen mislukt: ${error.message}`);
    },

    async verstuurNaarMonteurs(ids) {
      if (ids.length === 0) return; // niets te versturen
      const { error } = await client
        .from("meldingen")
        .update({ dashboard_status: "gepland", gewijzigd_te_versturen: false })
        .in("id", ids);
      if (error) throw new Error(`DB versturen mislukt: ${error.message}`);
    },

    async bevestigOntvangst(id) {
      const { error } = await client
        .from("meldingen")
        .update({ dashboard_status: "bevestigd", bevestigd_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(`DB bevestigen mislukt: ${error.message}`);
    },

    async wijzigOpdracht(id, planning, huidigeStatus) {
      const patch: Record<string, unknown> = {
        startdatum: planning.startdatum,
        starttijd: planning.starttijd,
        duur_dagen: planning.duur_dagen,
        uitvoerdatum: planning.startdatum,
      };
      if (planning.toegewezen_aan !== undefined) {
        patch.toegewezen_aan = planning.toegewezen_aan;
      }
      // Was de opdracht al naar de monteur, dan markeren als opnieuw te versturen (verstuur-poort).
      if (moetOpnieuwVersturen(huidigeStatus)) {
        patch.gewijzigd_te_versturen = true;
      }
      const { error } = await client.from("meldingen").update(patch).eq("id", id);
      if (error) throw new Error(`DB wijzigen mislukt: ${error.message}`);
    },

    async annuleerOpdracht(id) {
      const { error } = await client
        .from("meldingen")
        .update({ dashboard_status: "geannuleerd" })
        .eq("id", id);
      if (error) throw new Error(`DB annuleren mislukt: ${error.message}`);
    },
  };
}

/**
 * Backwards-compat: bouw een Db met een eigen service-role config.
 * Wordt nog gebruikt door db.test.ts (mock-server) en migrate-scripts.
 */
export function createDb(config: DbConfig): Db {
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return createDbFromClient(client);
}

/**
 * Hoofd-db voor user-acties in API-routes en server-components. Draait onder de sessie
 * van de ingelogde gebruiker en respecteert RLS. Per request opnieuw opgebouwd (cookies
 * wisselen per request, dus geen module-level cache mogelijk).
 */
export async function db(): Promise<Db> {
  const client = await createSupabaseServerClient();
  return createDbFromClient(client as unknown as SupabaseClient);
}

/**
 * Admin-db voor acties die RLS moeten omzeilen: rapport-PDF uploaden, migratie-scripts,
 * eventuele cross-user-rapportage. Service-role-key, gecached op module-niveau.
 */
let cachedAdminDb: Db | null = null;
export function dbAdmin(): Db {
  if (!cachedAdminDb) {
    const e = env();
    const client = createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedAdminDb = createDbFromClient(client);
  }
  return cachedAdminDb;
}
