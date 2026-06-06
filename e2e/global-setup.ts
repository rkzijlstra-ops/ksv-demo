import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Login-horde voor de browser-e2e: een robot kan niet door Google/magic-link heen. Daarom zetten we
 * eenmalig een (test)wachtwoord op het beheerder-account, loggen we server-side in en laten we
 * @supabase/ssr zélf de auth-cookies maken (juiste naam/chunking). Die schrijven we als Playwright-
 * storageState weg, zodat elke test ingelogd start. Raakt geen echte klantdata; de magic-link/Google-
 * login van het account blijft gewoon werken.
 */

const TEST_PW = "e2e-Kluslus-test-2026!";
const BEHEERDER = {
  uid: "443dff43-dc74-4216-8173-076f22973245",
  email: "bkmkeukenmontage@gmail.com",
};
const MONTEUR = {
  uid: "f0a2a56d-ccd9-434c-93b8-5f7257aa59c9",
  email: "r.k.zijlstra@gmail.com",
};

const ENV_PATH = path.join(process.cwd(), ".env.local");
const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");

function leesEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function schrijfSessie(opts: {
  url: string;
  anon: string;
  secret: string;
  uid: string;
  email: string;
  bestand: string;
  domein?: string;
}) {
  const domein = opts.domein ?? "localhost";
  const secure = domein !== "localhost";
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

  const storage = {
    cookies: Object.values(cookies).map((c) => ({
      name: c.name,
      value: c.value,
      domain: domein,
      path: "/",
      expires: -1,
      httpOnly: false,
      secure,
      sameSite: "Lax" as const,
    })),
    origins: [],
  };
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(path.join(AUTH_DIR, opts.bestand), JSON.stringify(storage, null, 2));
}

export default async function globalSetup() {
  const env = leesEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !anon || !secret) throw new Error("Supabase-env ontbreekt in .env.local");

  await schrijfSessie({ url, anon, secret, ...BEHEERDER, bestand: "beheerder.json" });
  await schrijfSessie({ url, anon, secret, ...MONTEUR, bestand: "monteur.json" });
  // Productie-sessie (Vercel) voor de mail-e2e, die tegen de live app draait waar de juiste
  // afzender (planning@kluslus.nl) is ingesteld.
  await schrijfSessie({
    url,
    anon,
    secret,
    ...MONTEUR,
    bestand: "monteur-prod.json",
    domein: "ksv-demo.vercel.app",
  });
}
