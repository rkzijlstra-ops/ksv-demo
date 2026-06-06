import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Gedeelde test-omgeving voor integratie- en browser-e2e. Geeft `.env.test` (het zijspoor:
 * een apart test-Supabase-project) voorrang boven `.env.local` (productie). Zolang er geen
 * `.env.test` is, draait alles tegen de huidige omgeving en verandert er niets.
 *
 * Zet voor een zijspoor in `.env.test`:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   E2E_BEHEERDER_UID, E2E_MONTEUR_UID (de uids in het test-project; e-mails optioneel)
 *   E2E_APP_URL (de test-deploy die naar het test-project wijst, voor de mail-e2e)
 */

function lees(file: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const local = lees(path.join(process.cwd(), ".env.local"));
const zijspoor = lees(path.join(process.cwd(), ".env.test"));
const env = { ...local, ...zijspoor }; // .env.test wint

export const OP_ZIJSPOOR = existsSync(path.join(process.cwd(), ".env.test"));

export const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_SECRET = env.SUPABASE_SECRET_KEY;
export const SUPABASE_ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

/** De live app voor de browser/mail-e2e. Wijs dit op een test-deploy zodra je een zijspoor hebt. */
export const APP_URL = env.E2E_APP_URL || "https://ksv-demo.vercel.app";
export const APP_HOST = new URL(APP_URL).host;

export const BEHEERDER = {
  uid: env.E2E_BEHEERDER_UID || "443dff43-dc74-4216-8173-076f22973245",
  email: env.E2E_BEHEERDER_EMAIL || "bkmkeukenmontage@gmail.com",
};
export const MONTEUR = {
  uid: env.E2E_MONTEUR_UID || "f0a2a56d-ccd9-434c-93b8-5f7257aa59c9",
  email: env.E2E_MONTEUR_EMAIL || "r.k.zijlstra@gmail.com",
};
/** Tijdelijke test-opdrachtgever; in setup aangemaakt, in teardown opgeruimd. */
export const OPDRACHTGEVER_EMAIL = env.E2E_OPDRACHTGEVER_EMAIL || "e2e-opdrachtgever@kluslus.test";
