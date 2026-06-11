import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { createSupabaseServerClient } from "./supabase-server";
import { scopeVoorDashboard } from "./dashboard-scope";
import { moetOpnieuwVersturen, opVerzondenPlek, type VerzondenPlek } from "./opdracht-status";
import type { ParsedPdf, MeldingItem } from "./parser-schema";
import type { ControlePunt } from "./oplever-controle";

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
  // klant-mailadres uit de PDF; voorinvulwaarde voor de klant-versie van het rapport, aanpasbaar
  klant_email: string | null;
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
  // blok 9: terugmelden aan kantoor (monteur kreeg de klus niet rond)
  teruggemeld_at: string | null;
  teruggemeld_reden: string | null;
  teruggemeld_toelichting: string | null;
  // wie de rij aanmaakte (aanmaker/inschieter): bepaalt o.a. of een monteur hem mag verwijderen
  user_id: string | null;
  // toegewezen monteur als uuid (auth-koppeling, blok 6) - kolom bestond al via createOpdracht
  toegewezen_aan: string | null;
  // monteur-naam voor de planning (vrije tekst, los van de uuid-koppeling)
  monteur_naam: string | null;
  // compleet-systeem blok 0: opdrachtgeverskant (levenscyclus + planning)
  dashboard_status: DashboardStatus;
  startdatum: string | null;
  starttijd: string | null;
  duur_dagen: number;
  gewijzigd_te_versturen: boolean;
  bevestigd_at: string | null;
  // de plek waarop de opdracht stond toen hij naar de monteur ging (om gewijzigd weer op te heffen)
  verzonden_monteur: string | null;
  verzonden_startdatum: string | null;
  verzonden_starttijd: string | null;
  // welk monteur-account de opdracht had toen hij verstuurd werd (identiteit, los van de naam)
  verzonden_toegewezen_aan: string | null;
  // compleet-systeem blok 6e: welke kantoor-zaak deze opdracht mag zien (null = ad-hoc, geen kantoor)
  opdrachtgever_id: string | null;
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
  /** Interne notitie: alleen voor de zaak, komt nooit in de klant-versie van het rapport. */
  interne_opmerking: string | null;
  /** Ontvanger voor de ZAAK-versie (bestaand gedrag). */
  rapport_email: string | null;
  /** Zaak-PDF + wanneer hij verstuurd is (null = nog niet). */
  rapport_url: string | null;
  zaak_rapport_verzonden_at: string | null;
  /** Klant-versie: adres, PDF en wanneer verstuurd (null = nog niet). */
  klant_rapport_email: string | null;
  klant_rapport_url: string | null;
  klant_rapport_verzonden_at: string | null;
  user_id: string | null;
  /** Controle-checklist die de klant aftekende (akkoord/niet akkoord per punt). */
  controle: ControlePunt[];
}

/** Input voor het opslaan/bijwerken van een oplevering-concept. */
export interface OpleveringConceptInput {
  opdracht_id: string;
  uitkomst?: "afgerond" | "openstaande_punten";
  eindstaat_foto_urls: string[];
  video_url: string | null;
  /** Weggelaten (undefined) = niet wijzigen; een array = de afgetekende controlepunten zetten. */
  controle?: ControlePunt[];
  /**
   * Weggelaten (undefined) = niet wijzigen, zodat een tussentijdse opslag de eerder gezette
   * handtekening niet per ongeluk wist. Expliciet null = wissen, een string = zetten.
   */
  handtekening_url?: string | null;
  opmerking?: string | null;
  /** Interne notitie (alleen voor de zaak). Undefined = niet wijzigen, null = wissen. */
  interne_opmerking?: string | null;
  rapport_email?: string | null;
  /** Voorgesteld/aangepast klant-mailadres voor de klant-versie. */
  klant_rapport_email?: string | null;
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

/** Eén regel uit het gebeurtenissen-logboek (audit-trail): wie deed wat wanneer met een klus. */
export interface Gebeurtenis {
  id: string;
  created_at: string;
  opdracht_id: string | null;
  actie: string;
  door_id: string | null;
  door_naam: string | null;
  door_rol: string | null;
  details: Record<string, unknown> | null;
}

export interface GebeurtenisInput {
  opdracht_id: string;
  actie: string;
  door_id: string;
  door_naam: string | null;
  door_rol: string | null;
  details?: Record<string, unknown> | null;
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
  /** Kantoor-zaak waar de opdracht bij hoort; null = ad-hoc (zelf ingeschoten, geen kantoor). */
  opdrachtgever_id?: string | null;
}

/** Corrigeerbare kop-gegevens van een opdracht (parser-fouten herstellen na inschieten). */
export interface OpdrachtGegevensInput {
  klant_naam: string | null;
  klant_adres: string | null;
  klant_telefoon: string | null;
  referentienummer: string | null;
  keukenzaak: string | null;
  documenttype: "orderbevestiging" | "werkbon_service" | "tekst" | "onbekend";
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
  /** Account (uuid) van de toegewezen monteur; nodig voor afscherming en mail. */
  toegewezen_aan: string | null;
  /** Naam van de monteur voor de weergave. */
  monteur_naam: string | null;
  startdatum: string;
  starttijd: string | null;
  duur_dagen: number;
}

/** Rol van een ingelogde gebruiker (blok 6). */
export type Rol = "beheerder" | "opdrachtgever" | "monteur";

/** Een zaak (opdrachtgever); voor nu één: Keukenstudio Voorschoten. */
export interface Opdrachtgever {
  id: string;
  naam: string;
  created_at: string;
}

/** Profiel van een gebruiker: rol, naam en (voor monteur/opdrachtgever) de zaak. */
export interface Profiel {
  id: string;
  rol: Rol;
  naam: string;
  opdrachtgever_id: string | null;
  created_at: string;
  // blok 10: afzender-gegevens voor het opleverrapport (door de gebruiker zelf ingevuld)
  bedrijfsnaam: string | null;
  telefoon: string | null;
  contact_email: string | null;
  // blok 12: SMS-notificatie-voorkeuren (monteur regelt ze zelf in mijn-gegevens)
  sms_werk_kritiek: boolean;
  sms_overig: boolean;
}

/** De velden die een gebruiker zelf mag bijwerken (naam + afzender, nooit zijn rol). */
export interface EigenGegevensInput {
  naam: string | null;
  bedrijfsnaam: string | null;
  telefoon: string | null;
  contact_email: string | null;
  sms_werk_kritiek: boolean;
  sms_overig: boolean;
}

export interface ProfielInput {
  id: string;
  rol: Rol;
  naam: string;
  opdrachtgever_id: string | null;
}

/** Een opgeslagen ontvanger in het persoonlijke adresboek van een gebruiker (blok 13). */
export interface Adres {
  id: string;
  naam: string;
  email: string;
}

export interface Db {
  insertPdfMelding(data: ParsedPdf): Promise<{ id: string }>;
  createOpdracht(input: OpdrachtInput): Promise<{ id: string }>;
  /** Corrigeert de kop-gegevens van een opdracht (klant, adres, referentie, keukenzaak, type). */
  updateOpdrachtGegevens(id: string, input: OpdrachtGegevensInput): Promise<void>;
  addDocument(input: DocumentInput): Promise<{ id: string }>;
  getDocumentenVoorOpdracht(opdrachtId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | null>;
  logGebeurtenis(input: GebeurtenisInput): Promise<void>;
  getGebeurtenissenVoor(opdrachtId: string): Promise<Gebeurtenis[]>;
  getMeldingen(): Promise<Melding[]>;
  /** De oplever-werkpool van één persoon: top-level opdrachten die aan hem zijn toegewezen. */
  getWerkpoolVoor(userId: string): Promise<Melding[]>;
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
  /** Klant-versie verstuurd: onthoud adres, PDF en tijdstip. Raakt de opdracht-status niet. */
  registreerKlantRapport(opdrachtId: string, rapportUrl: string, naar: string): Promise<void>;
  /**
   * Zaak-versie verstuurd: onthoud PDF + tijdstip op de oplevering, en zet de opdracht PAS nu op
   * opgeleverd. Hierdoor ziet het kantoor het oplevermoment niet eerder dan de monteur het deelt.
   */
  registreerZaakRapport(opdrachtId: string, rapportUrl: string): Promise<void>;
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
  /** Markeer als verstuurd: status gepland, gewijzigd-marker uit, en onthoud de verzonden plek. */
  markeerVerzonden(id: string, verzonden: VerzondenPlek): Promise<void>;
  getKlussenVoorHerinnering(verzondenVoorIso: string): Promise<Melding[]>;
  markeerHerinneringVerzonden(ids: string[]): Promise<void>;
  bevestigOntvangst(id: string): Promise<void>;
  wijzigOpdracht(
    id: string,
    planning: PlanningInput,
    huidigeStatus: DashboardStatus,
    verzonden?: VerzondenPlek | null,
  ): Promise<void>;
  annuleerOpdracht(id: string): Promise<void>;
  ontplanOpdracht(id: string): Promise<void>;
  markeerTeruggemeld(id: string, input: { reden: string; toelichting: string | null }): Promise<void>;
  // blok 6: accounts/rollen
  getProfiel(userId: string): Promise<Profiel | null>;
  getProfielen(): Promise<Profiel[]>;
  getMonteurs(): Promise<Profiel[]>;
  getStandaardOpdrachtgever(): Promise<Opdrachtgever | null>;
  upsertProfiel(input: ProfielInput): Promise<void>;
  /** Werkt de eigen afzender-velden bij (via SECURITY DEFINER, kan de rol niet raken). */
  updateEigenGegevens(input: EigenGegevensInput): Promise<void>;
  telBeheerders(): Promise<number>;
  telToegewezenOpdrachten(monteurId: string): Promise<number>;
  updateProfielRol(id: string, rol: Rol): Promise<void>;
  updateProfielNaam(id: string, naam: string): Promise<void>;
  /** Persoonlijk adresboek (blok 13): RLS scopt automatisch op de ingelogde gebruiker. */
  getAdresboek(): Promise<Adres[]>;
  voegAdresToe(naam: string, email: string): Promise<{ id: string }>;
  werkAdresBij(id: string, naam: string, email: string): Promise<void>;
  verwijderAdres(id: string): Promise<void>;
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
          opdrachtgever_id: input.opdrachtgever_id ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`DB insert mislukt: ${error.message}`);
      if (!row || typeof row.id !== "string") {
        throw new Error("DB insert lukte maar geen id terug");
      }
      return { id: row.id };
    },

    async updateOpdrachtGegevens(id: string, input: OpdrachtGegevensInput) {
      const { error } = await client
        .from("meldingen")
        .update({
          klant_naam: input.klant_naam,
          klant_adres: input.klant_adres,
          klant_telefoon: input.klant_telefoon,
          referentienummer: input.referentienummer,
          keukenzaak: input.keukenzaak,
          documenttype: input.documenttype,
        })
        .eq("id", id);
      if (error) throw new Error(`DB bijwerken mislukt: ${error.message}`);
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

    async getDocumentById(id: string) {
      const { data, error } = await client.from("documenten").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data as Document | null) ?? null;
    },

    async logGebeurtenis(input) {
      const { error } = await client.from("gebeurtenissen").insert({
        opdracht_id: input.opdracht_id,
        actie: input.actie,
        door_id: input.door_id,
        door_naam: input.door_naam,
        door_rol: input.door_rol,
        details: input.details ?? null,
      });
      if (error) throw new Error(`DB log mislukt: ${error.message}`);
    },

    async getGebeurtenissenVoor(opdrachtId: string) {
      const { data, error } = await client
        .from("gebeurtenissen")
        .select("*")
        .eq("opdracht_id", opdrachtId)
        .order("created_at", { ascending: false });
      if (error) {
        // Tabel bestaat nog niet (DB niet gemigreerd met blok 8): geen logboek, maar geen crash.
        if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|find the table/i.test(error.message)) {
          return [];
        }
        throw new Error(`DB lezen mislukt: ${error.message}`);
      }
      return (data ?? []) as Gebeurtenis[];
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

    async getWerkpoolVoor(userId: string) {
      // De monteur ziet zijn klussen op de "effectieve" monteur: normaal de huidige toewijzing, maar
      // bij een nog-niet-opnieuw-verstuurde wijziging de VERZONDEN monteur. Zo houdt hij een aan hem
      // verstuurde klus vast als kantoor hem op het planbord naar een ander schuift, tot het opnieuw
      // verstuurd is (gat 5). Vereist de uitgebreide RLS uit schema-compleet-7.
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .is("opdracht_id", null)
        .is("verwijderd_at", null)
        .or(
          `and(gewijzigd_te_versturen.is.false,toegewezen_aan.eq.${userId}),` +
            `and(gewijzigd_te_versturen.is.true,verzonden_toegewezen_aan.eq.${userId})`,
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
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
      // Controle idem: alleen schrijven als meegegeven, zodat een tussenopslag hem niet leegmaakt.
      if (input.controle !== undefined) {
        payload.controle = input.controle;
      }
      // Interne notitie en klant-adres: zelfde discipline (undefined = ongemoeid laten), zodat een
      // losse tussenopslag ze niet per ongeluk wist.
      if (input.interne_opmerking !== undefined) {
        payload.interne_opmerking = input.interne_opmerking;
      }
      if (input.klant_rapport_email !== undefined) {
        payload.klant_rapport_email = input.klant_rapport_email;
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

    async registreerKlantRapport(opdrachtId, rapportUrl, naar) {
      const { error } = await client
        .from("opleveringen")
        .update({
          klant_rapport_url: rapportUrl,
          klant_rapport_email: naar,
          klant_rapport_verzonden_at: new Date().toISOString(),
        })
        .eq("opdracht_id", opdrachtId);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async registreerZaakRapport(opdrachtId, rapportUrl) {
      const nu = new Date().toISOString();
      // Zaak-PDF + tijdstip op de oplevering.
      const { error: opErr } = await client
        .from("opleveringen")
        .update({ rapport_url: rapportUrl, zaak_rapport_verzonden_at: nu })
        .eq("opdracht_id", opdrachtId);
      if (opErr) throw new Error(`DB update mislukt: ${opErr.message}`);
      // Pas nu de opdracht op opgeleverd zetten (het kantoor ziet het oplevermoment nu pas).
      const { error: mErr } = await client
        .from("meldingen")
        .update({ opdracht_status: "opgeleverd", opgeleverd_at: nu, rapport_url: rapportUrl })
        .eq("id", opdrachtId);
      if (mErr) throw new Error(`DB update mislukt: ${mErr.message}`);
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
        // Alleen kantoor-opdrachten (met een zaak). Ad-hoc/zelf-ingeschoten klussen horen niet op
        // het dashboard of planbord; die staan in de oplever-werkpool van de monteur.
        .not("opdrachtgever_id", "is", null)
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
        monteur_naam: planning.monteur_naam,
        toegewezen_aan: planning.toegewezen_aan,
        // uitvoerdatum gelijkhouden aan startdatum: de monteur-werkpool leest die nog.
        uitvoerdatum: planning.startdatum,
      };
      const { error } = await client.from("meldingen").update(patch).eq("id", id);
      if (error) throw new Error(`DB plannen mislukt: ${error.message}`);
    },

    async markeerVerzonden(id, verzonden) {
      const { error } = await client
        .from("meldingen")
        .update({
          dashboard_status: "gepland",
          gewijzigd_te_versturen: false,
          verzonden_monteur: verzonden.monteur_naam,
          verzonden_toegewezen_aan: verzonden.toegewezen_aan,
          verzonden_startdatum: verzonden.startdatum,
          verzonden_starttijd: verzonden.starttijd,
          verzonden_at: new Date().toISOString(),
          herinnering_verzonden_at: null,
        })
        .eq("id", id);
      if (error) throw new Error(`DB versturen mislukt: ${error.message}`);
    },

    async getKlussenVoorHerinnering(verzondenVoorIso: string) {
      const { data, error } = await client
        .from("meldingen")
        .select("*")
        .eq("dashboard_status", "gepland")
        .is("opdracht_id", null)
        .is("herinnering_verzonden_at", null)
        .not("toegewezen_aan", "is", null)
        .lt("verzonden_at", verzondenVoorIso)
        .order("verzonden_at", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Melding[];
    },

    async markeerHerinneringVerzonden(ids: string[]) {
      if (ids.length === 0) return;
      const { error } = await client
        .from("meldingen")
        .update({ herinnering_verzonden_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw new Error(`DB herinnering markeren mislukt: ${error.message}`);
    },

    async bevestigOntvangst(id) {
      const { error } = await client
        .from("meldingen")
        .update({ dashboard_status: "bevestigd", bevestigd_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(`DB bevestigen mislukt: ${error.message}`);
    },

    async wijzigOpdracht(id, planning, huidigeStatus, verzonden) {
      // Opnieuw versturen nodig als de opdracht al verstuurd was EN niet exact terug staat op de
      // verzonden plek. Zo heft terugzetten op de oorspronkelijke plek de markering weer op.
      const opnieuw = moetOpnieuwVersturen(huidigeStatus) && !opVerzondenPlek(planning, verzonden);
      const patch: Record<string, unknown> = {
        startdatum: planning.startdatum,
        starttijd: planning.starttijd,
        duur_dagen: planning.duur_dagen,
        monteur_naam: planning.monteur_naam,
        toegewezen_aan: planning.toegewezen_aan,
        uitvoerdatum: planning.startdatum,
        gewijzigd_te_versturen: opnieuw,
      };
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

    async ontplanOpdracht(id) {
      // Terug naar de pool: status binnen, planning leeg, gewijzigd-marker reset. Ook de
      // monteur-toewijzing wissen, anders blijft de klus in de werkpool van die monteur hangen
      // (getWerkpoolVoor filtert op toegewezen_aan, en RLS toont de monteur zijn toegewezen rijen).
      const { error } = await client
        .from("meldingen")
        .update({
          dashboard_status: "binnen",
          toegewezen_aan: null,
          monteur_naam: null,
          startdatum: null,
          starttijd: null,
          uitvoerdatum: null,
          gewijzigd_te_versturen: false,
          verzonden_monteur: null,
          verzonden_toegewezen_aan: null,
          verzonden_startdatum: null,
          verzonden_starttijd: null,
        })
        .eq("id", id);
      if (error) throw new Error(`DB ontplannen mislukt: ${error.message}`);
    },

    async markeerTeruggemeld(id, input) {
      const { error } = await client
        .from("meldingen")
        .update({
          teruggemeld_at: new Date().toISOString(),
          teruggemeld_reden: input.reden,
          teruggemeld_toelichting: input.toelichting,
        })
        .eq("id", id);
      if (error) throw new Error(`DB terugmelden mislukt: ${error.message}`);
    },

    async getProfiel(userId: string) {
      const { data, error } = await client
        .from("profielen")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data as Profiel | null) ?? null;
    },

    async getProfielen() {
      const { data, error } = await client
        .from("profielen")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Profiel[];
    },

    async getMonteurs() {
      // Inplanbare mensen: monteurs én de beheerder (die werkt zelf ook mee en moet klussen
      // naar zichzelf kunnen plannen). Opdrachtgevers staan hier bewust niet bij.
      const { data, error } = await client
        .from("profielen")
        .select("*")
        .in("rol", ["monteur", "beheerder"])
        .order("naam", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Profiel[];
    },

    async getStandaardOpdrachtgever() {
      const { data, error } = await client
        .from("opdrachtgevers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return ((data ?? []) as Opdrachtgever[])[0] ?? null;
    },

    async upsertProfiel(input) {
      const { error } = await client.from("profielen").upsert(
        {
          id: input.id,
          rol: input.rol,
          naam: input.naam,
          opdrachtgever_id: input.opdrachtgever_id,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`DB upsert mislukt: ${error.message}`);
    },

    async updateEigenGegevens(input) {
      const { error } = await client.rpc("update_eigen_gegevens", {
        p_naam: input.naam,
        p_bedrijfsnaam: input.bedrijfsnaam,
        p_telefoon: input.telefoon,
        p_contact_email: input.contact_email,
        p_sms_werk_kritiek: input.sms_werk_kritiek,
        p_sms_overig: input.sms_overig,
      });
      if (error) throw new Error(`DB gegevens opslaan mislukt: ${error.message}`);
    },

    async telBeheerders() {
      const { data, error } = await client
        .from("profielen")
        .select("id")
        .eq("rol", "beheerder");
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []).length;
    },

    async telToegewezenOpdrachten(monteurId: string) {
      // Openstaande klussen: top-level opdrachten van deze monteur die nog niet af/geannuleerd zijn.
      const { data, error } = await client
        .from("meldingen")
        .select("id")
        .eq("toegewezen_aan", monteurId)
        .is("opdracht_id", null)
        .not("dashboard_status", "in", '("opgeleverd","geannuleerd")');
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []).length;
    },

    async updateProfielRol(id: string, rol: Rol) {
      const { error } = await client.from("profielen").update({ rol }).eq("id", id);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async updateProfielNaam(id: string, naam: string) {
      const { error } = await client.from("profielen").update({ naam }).eq("id", id);
      if (error) throw new Error(`DB update mislukt: ${error.message}`);
    },

    async getAdresboek() {
      const { data, error } = await client
        .from("adresboek")
        .select("id, naam, email")
        .order("naam", { ascending: true });
      if (error) throw new Error(`DB lezen mislukt: ${error.message}`);
      return (data ?? []) as Adres[];
    },

    async voegAdresToe(naam: string, email: string) {
      // user_id krijgt zijn default auth.uid() (RLS-insert eist user_id = auth.uid()).
      const { data, error } = await client
        .from("adresboek")
        .insert({ naam, email })
        .select("id")
        .single();
      if (error) throw new Error(`DB opslaan mislukt: ${error.message}`);
      if (!data || typeof data.id !== "string") throw new Error("Adres opslaan lukte maar geen id terug");
      return { id: data.id };
    },

    async werkAdresBij(id: string, naam: string, email: string) {
      const { error } = await client.from("adresboek").update({ naam, email }).eq("id", id);
      if (error) throw new Error(`DB bijwerken mislukt: ${error.message}`);
    },

    async verwijderAdres(id: string) {
      const { error } = await client.from("adresboek").delete().eq("id", id);
      if (error) throw new Error(`DB verwijderen mislukt: ${error.message}`);
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
