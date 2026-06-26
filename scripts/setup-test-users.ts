/**
 * Maakt twee testgebruikers aan in het test-Supabase-project en schrijft hun UIDs
 * terug in .env.test. Daarna is `npm run test:int` klaar om te draaien.
 *
 * Vereisten: .env.test bestaat en heeft SUPABASE_URL + SUPABASE_SECRET_KEY ingevuld.
 * Draaien: npm run setup:test
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

function leesEnv(bestand: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(bestand)) return env;
  for (const regel of readFileSync(bestand, "utf8").split(/\r?\n/)) {
    const m = regel.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const envPad = path.join(process.cwd(), ".env.test");

if (!existsSync(envPad)) {
  console.error("\n✗ .env.test bestaat niet. Kopieer .env.test.example naar .env.test en vul URL + keys in.\n");
  process.exit(1);
}

const env = leesEnv(envPad);
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const secret = env.SUPABASE_SECRET_KEY || "";

if (!url || url.includes("JOUW-TEST-PROJECT") || !secret || secret.startsWith("sb_secret_...")) {
  console.error("\n✗ Vul SUPABASE_URL en SUPABASE_SECRET_KEY in .env.test in (via Supabase → Settings → API).\n");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function maakGebruiker(email: string, wachtwoord: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
  });
  if (data?.user) return data.user.id;
  if (error && !error.message.toLowerCase().includes("already")) throw error;

  // Gebruiker bestaat al: zoek op e-mail
  let page = 1;
  while (true) {
    const { data: lijst, error: le } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (le) throw le;
    const gevonden = lijst?.users.find((u) => u.email === email);
    if (gevonden) return gevonden.id;
    if (!lijst?.users.length) break;
    page++;
  }
  throw new Error(`Kon ${email} niet vinden na aanmaakopdracht.`);
}

async function run() {
  console.log("\nTest-Supabase-project:", url);

  // Opdrachtgever (zaak) ophalen — ingezet door het schema.
  const { data: zaak, error: ze } = await admin.from("opdrachtgevers").select("id").limit(1).single();
  if (ze || !zaak) {
    throw new Error("Geen opdrachtgever gevonden. Draai het schema (test-schema.sql) opnieuw.");
  }

  console.log("Beheerder aanmaken…");
  const beheerderUid = await maakGebruiker("test-beheerder@kluslus.test", "Testbeheerder1!");

  console.log("Monteur aanmaken…");
  const monteurUid = await maakGebruiker("test-monteur@kluslus.test", "Testmonteur1!");

  // Profielen upserten (service_role bypast RLS).
  const { error: pe } = await admin.from("profielen").upsert([
    { id: beheerderUid, rol: "beheerder", naam: "Test Beheerder", opdrachtgever_id: zaak.id },
    {
      id: monteurUid,
      rol: "monteur",
      naam: "Test Monteur",
      opdrachtgever_id: zaak.id,
      // Compleet, anders stuurt de onboarding-gate elke monteur-pagina naar /welkom.
      bedrijfsnaam: "Test Montage",
      telefoon: "0612345678",
      contact_email: "test-monteur@kluslus.test",
    },
  ]);
  if (pe) throw pe;

  // UIDs in .env.test bijwerken.
  let tekst = readFileSync(envPad, "utf8");
  const vervang = (sleutel: string, waarde: string) =>
    (tekst = tekst.replace(new RegExp(`^${sleutel}=.*`, "m"), `${sleutel}=${waarde}`));

  vervang("E2E_BEHEERDER_UID", beheerderUid);
  vervang("E2E_BEHEERDER_EMAIL", "test-beheerder@kluslus.test");
  vervang("E2E_MONTEUR_UID", monteurUid);
  vervang("E2E_MONTEUR_EMAIL", "test-monteur@kluslus.test");
  writeFileSync(envPad, tekst, "utf8");

  console.log(`\n✓ Beheerder: ${beheerderUid}`);
  console.log(`✓ Monteur:   ${monteurUid}`);
  console.log(`✓ UIDs weggeschreven in .env.test`);
  console.log(`\nKlaar. Draai nu:\n  npm run test:int\n`);
}

run().catch((e) => {
  console.error("\n✗ Fout:", (e as Error).message || e);
  process.exit(1);
});
