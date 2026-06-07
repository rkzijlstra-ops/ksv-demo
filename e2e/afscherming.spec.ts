import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_ANON, SUPABASE_SECRET, BEHEERDER, MONTEUR, OPDRACHTGEVER_EMAIL, TEST_PW } from "./test-env";

/**
 * Negatieve afscherming-tests op de DATA-laag (RLS direct), het echte vangnet tegen privacy-lekken:
 * een rol-geauthenticeerde client probeert bij de kind-data (documenten, oplevering) van andermans
 * klus/zaak te komen en mag dat NIET. Toetst de bestaande RLS (mag_opdracht) en bewaakt hem tegen
 * toekomstige migraties (gat 1 uit TOEGANG.md). Seedt met service-role, leest met rol-clients.
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

async function rolClient(email: string): Promise<SupabaseClient> {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PW });
  if (error) throw new Error(`Inloggen als ${email} mislukt: ${error.message}`);
  return c;
}

const ANDERE_MONTEUR = "00000000-0000-4000-8000-000000000099";
let andereZaakId = "";
let andereKlusId = ""; // andere monteur, andere zaak
let eigenKlusId = ""; // toegewezen aan onze testmonteur, standaard-zaak

async function zetDocEnOplevering(opdrachtId: string, naam: string) {
  await db.addDocument({
    opdracht_id: opdrachtId,
    type: "pdf",
    bestandsnaam: naam,
    storage_pad: `${opdrachtId}.pdf`,
    publieke_url: `https://x/opdracht-documenten/${opdrachtId}.pdf`,
    referentienummer: null,
    is_primair: true,
    user_id: MONTEUR.uid,
  });
  await db.upsertOpleveringConcept({
    opdracht_id: opdrachtId,
    eindstaat_foto_urls: [`https://x/foto-${opdrachtId}.png`],
    video_url: null,
    opmerking: null,
    rapport_email: null,
    user_id: MONTEUR.uid,
  });
}

test.beforeAll(async () => {
  const stamp = `${Date.now()}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: az } = await admin.from("opdrachtgevers").insert({ naam: `E2E Afscherming Zaak ${stamp}` }).select("id").single();
  andereZaakId = az!.id;

  const ander = await db.createOpdracht({
    documenttype: "werkbon_service", klant_naam: `AFSCHERM-ANDER ${stamp}`, klant_adres: "Teststraat 1",
    referentienummer: `AF${stamp}`, adviseur: null, klant_telefoon: null, leverweek: null,
    keukenzaak: "Andere Zaak", user_id: MONTEUR.uid, toegewezen_aan: ANDERE_MONTEUR, opdrachtgever_id: andereZaakId,
  });
  andereKlusId = ander.id;
  await zetDocEnOplevering(andereKlusId, "ander-bron.pdf");

  const eigen = await db.createOpdracht({
    documenttype: "werkbon_service", klant_naam: `AFSCHERM-EIGEN ${stamp}`, klant_adres: "Teststraat 1",
    referentienummer: `AE${stamp}`, adviseur: null, klant_telefoon: null, leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten", user_id: MONTEUR.uid, toegewezen_aan: MONTEUR.uid, opdrachtgever_id: zaak?.id ?? null,
  });
  eigenKlusId = eigen.id;
  await zetDocEnOplevering(eigenKlusId, "eigen-bron.pdf");
});

test.afterAll(async () => {
  for (const id of [andereKlusId, eigenKlusId]) {
    if (id) {
      await admin.from("documenten").delete().eq("opdracht_id", id);
      await admin.from("opleveringen").delete().eq("opdracht_id", id);
      await admin.from("meldingen").delete().eq("id", id);
    }
  }
  if (andereZaakId) await admin.from("opdrachtgevers").delete().eq("id", andereZaakId);
});

test("monteur ziet GEEN documenten/oplevering van een klus die niet aan hem is toegewezen", async () => {
  const m = await rolClient(MONTEUR.email);
  // Afscherming: andermans klus.
  expect((await m.from("documenten").select("id").eq("opdracht_id", andereKlusId)).data).toHaveLength(0);
  expect((await m.from("opleveringen").select("id").eq("opdracht_id", andereKlusId)).data).toHaveLength(0);
  // Sanity: eigen toegewezen klus ziet hij WEL (anders toetst de query niets).
  expect((await m.from("documenten").select("id").eq("opdracht_id", eigenKlusId)).data?.length ?? 0).toBeGreaterThan(0);
});

test("opdrachtgever ziet GEEN documenten/oplevering van een klus uit een andere zaak", async () => {
  const o = await rolClient(OPDRACHTGEVER_EMAIL);
  // Afscherming: andere zaak.
  expect((await o.from("documenten").select("id").eq("opdracht_id", andereKlusId)).data).toHaveLength(0);
  expect((await o.from("opleveringen").select("id").eq("opdracht_id", andereKlusId)).data).toHaveLength(0);
  // Sanity: eigen zaak ziet hij WEL.
  expect((await o.from("documenten").select("id").eq("opdracht_id", eigenKlusId)).data?.length ?? 0).toBeGreaterThan(0);
});

test("monteur kan andermans klus NIET wijzigen of verwijderen (gat 2)", async () => {
  const m = await rolClient(MONTEUR.email);
  const upd = await m.from("meldingen").update({ klant_naam: "GEHACKT" }).eq("id", andereKlusId).select("id");
  expect(upd.data ?? []).toHaveLength(0); // RLS: geen rij geraakt
  const del = await m.from("meldingen").delete().eq("id", andereKlusId).select("id");
  expect(del.data ?? []).toHaveLength(0);
  // Verificatie via service-role: de klus bestaat nog en is ongewijzigd.
  const check = await admin.from("meldingen").select("klant_naam").eq("id", andereKlusId).single();
  expect(check.data?.klant_naam).not.toBe("GEHACKT");
});

test("monteur ziet alleen zijn eigen profiel, niet de namen/rollen van anderen (gat 3)", async () => {
  const m = await rolClient(MONTEUR.email);
  const ids = ((await m.from("profielen").select("id")).data ?? []).map((r) => r.id as string);
  expect(ids).toContain(MONTEUR.uid); // eigen rij wel
  expect(ids).not.toContain(BEHEERDER.uid); // andermans rij niet
});
