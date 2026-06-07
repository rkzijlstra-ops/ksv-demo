import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  SUPABASE_URL,
  SUPABASE_SECRET,
  SUPABASE_ANON,
  APP_HOST,
  BEHEERDER,
  MONTEUR,
  OPDRACHTGEVER_EMAIL,
  TEST_PW,
} from "./test-env";

/**
 * Login-horde voor de browser-e2e: een robot kan niet door Google/magic-link heen. Daarom zetten we
 * eenmalig een (test)wachtwoord op de accounts, loggen we server-side in en laten we @supabase/ssr
 * zélf de auth-cookies maken (juiste naam/chunking). Die schrijven we als Playwright-storageState
 * weg, zodat elke test ingelogd start. Accounts/omgeving komen uit test-env (zijspoor-bewust).
 */

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

/**
 * Logt een account EEN keer in en schrijft die ene sessie weg voor alle gevraagde domeinen.
 * Belangrijk: per account maar één keer inloggen, anders maakt een tweede login de eerste sessie
 * ongeldig (en faalt de andere storageState).
 */
async function schrijfSessies(opts: {
  url: string;
  anon: string;
  secret: string;
  uid: string;
  email: string;
  targets: { bestand: string; domein: string }[];
}) {
  const admin = createClient(opts.url, opts.secret, { auth: { persistSession: false } });
  const { error: pwFout } = await admin.auth.admin.updateUserById(opts.uid, { password: TEST_PW });
  if (pwFout) throw new Error(`Wachtwoord zetten mislukt: ${pwFout.message}`);

  // @supabase/ssr maakt zelf de cookies; wij vangen ze op via de setAll-callback.
  const cookies: Record<string, { name: string; value: string }> = {};
  const supabase = createServerClient(opts.url, opts.anon, {
    cookies: {
      getAll: () => Object.values(cookies),
      setAll: (toSet) => toSet.forEach((c) => (cookies[c.name] = { name: c.name, value: c.value })),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: opts.email, password: TEST_PW });
  if (error) throw new Error(`Inloggen mislukt: ${error.message}`);

  mkdirSync(AUTH_DIR, { recursive: true });
  for (const { bestand, domein } of opts.targets) {
    const storage = {
      cookies: Object.values(cookies).map((c) => ({
        name: c.name,
        value: c.value,
        domain: domein,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: domein !== "localhost",
        sameSite: "Lax" as const,
      })),
      origins: [],
    };
    writeFileSync(path.join(AUTH_DIR, bestand), JSON.stringify(storage, null, 2));
  }
}

/** Zorgt dat er een test-opdrachtgever bestaat (gekoppeld aan de standaard-zaak) en geeft de uid. */
async function ensureOpdrachtgever(url: string, secret: string): Promise<string> {
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: lijst } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let uid = lijst?.users?.find((u) => u.email?.toLowerCase() === OPDRACHTGEVER_EMAIL)?.id;
  if (!uid) {
    const { data: maak, error } = await admin.auth.admin.createUser({
      email: OPDRACHTGEVER_EMAIL,
      email_confirm: true,
    });
    if (error || !maak?.user) throw new Error(`Test-opdrachtgever aanmaken mislukt: ${error?.message}`);
    uid = maak.user.id;
  }
  const { data: zaken } = await admin.from("opdrachtgevers").select("id").order("created_at").limit(1);
  const zaakId = zaken?.[0]?.id ?? null;
  await admin
    .from("profielen")
    .upsert({ id: uid, rol: "opdrachtgever", naam: "E2E Opdrachtgever", opdrachtgever_id: zaakId }, { onConflict: "id" });
  return uid;
}

/**
 * Zorgt dat beheerder en monteur een profielen-rij hebben. Zonder die rij geeft de RLS-functie
 * mijn_rol() null terug, waardoor meldingen_select alle queries blokkeert en de planbord-pool
 * leeg blijft in de browser. Idempotent: upsert op conflict (id).
 */
async function ensureProfielen(url: string, secret: string) {
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data: zaken } = await admin.from("opdrachtgevers").select("id").order("created_at").limit(1);
  const zaakId = zaken?.[0]?.id ?? null;
  await admin.from("profielen").upsert(
    { id: BEHEERDER.uid, rol: "beheerder", naam: "E2E Beheerder", opdrachtgever_id: zaakId },
    { onConflict: "id" },
  );
  await admin.from("profielen").upsert(
    { id: MONTEUR.uid, rol: "monteur", naam: "E2E Monteur", opdrachtgever_id: zaakId },
    { onConflict: "id" },
  );
}

export default async function globalSetup() {
  const url = SUPABASE_URL;
  const anon = SUPABASE_ANON;
  const secret = SUPABASE_SECRET;
  if (!url || !anon || !secret) throw new Error("Supabase-env ontbreekt (.env.local of .env.test)");

  const VERCEL = APP_HOST;
  await ensureProfielen(url, secret);
  const ogUid = await ensureOpdrachtgever(url, secret);

  // Per account ÉÉN keer inloggen; localhost voor de gewone e2e, vercel-domein voor de mail-e2e.
  await schrijfSessies({
    url,
    anon,
    secret,
    uid: ogUid,
    email: OPDRACHTGEVER_EMAIL,
    targets: [{ bestand: "opdrachtgever.json", domein: "localhost" }],
  });
  await schrijfSessies({
    url,
    anon,
    secret,
    ...BEHEERDER,
    targets: [
      { bestand: "beheerder.json", domein: "localhost" },
      { bestand: "beheerder-prod.json", domein: VERCEL },
    ],
  });
  await schrijfSessies({
    url,
    anon,
    secret,
    ...MONTEUR,
    targets: [
      { bestand: "monteur.json", domein: "localhost" },
      { bestand: "monteur-prod.json", domein: VERCEL },
    ],
  });
}
