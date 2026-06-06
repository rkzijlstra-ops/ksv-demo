import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * De overige mail-flows end-to-end tegen productie: spoedmelding, uitnodiging en afmelding.
 * Triggert de echte routes met een beheerder-sessie; daarna in de BKM-mailbox te controleren.
 * Verstuurt echt, dus achter E2E_MAIL=1:
 *   E2E_MAIL=1 npx playwright test e2e/mail-flows.spec.ts
 */

test.use({
  baseURL: "https://ksv-demo.vercel.app",
  storageState: "e2e/.auth/beheerder-prod.json",
});

function leesEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = leesEnv();
const URL_ = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
const BEHEERDER = "443dff43-dc74-4216-8173-076f22973245";

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

let oId = "";
let mId = "";
let accUid = "";

test.beforeEach(() => {
  test.skip(!process.env.E2E_MAIL, "Verstuurt echt een mail; draai met E2E_MAIL=1");
  oId = "";
  mId = "";
  accUid = "";
});

test.afterEach(async () => {
  if (mId) await admin.from("meldingen").delete().eq("id", mId);
  if (oId) await admin.from("meldingen").delete().eq("id", oId);
  if (accUid) await admin.auth.admin.deleteUser(accUid).catch(() => {});
});

async function zoekUidOpEmail(email: string): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

test("spoedmelding-mail wordt naar kantoor verstuurd", async ({ page }) => {
  const stamp = Date.now();
  const klant = `SPOEDTEST ${stamp}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const o = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `SP${stamp}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: BEHEERDER,
    toegewezen_aan: BEHEERDER,
    opdrachtgever_id: zaak?.id ?? null,
  });
  oId = o.id;
  const { data: melding } = await admin
    .from("meldingen")
    .insert({
      bron: "monteur",
      opdracht_id: oId,
      spoed: true,
      ruwe_tekst: `Lekkage onder de spoelbak ${stamp}`,
      foto_urls: [],
      meldingen: [],
      user_id: BEHEERDER,
      status: "concept",
    })
    .select("id")
    .single();
  mId = melding!.id;

  const res = await page.request.post(`/api/meldingen/${mId}/spoed-versturen`);
  expect(res.ok()).toBeTruthy();
  console.log(`SPOEDMAIL klant="${klant}"`);
});

test("uitnodigingsmail wordt naar de nieuwe gebruiker verstuurd", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+invtest${stamp}@gmail.com`;
  const res = await page.request.post(`/api/mensen/uitnodigen`, {
    data: { naam: `Invtest ${stamp}`, email, rol: "monteur" },
  });
  expect(res.ok()).toBeTruthy();
  accUid = (await zoekUidOpEmail(email)) ?? "";
  console.log(`INVITEMAIL email=${email}`);
});

test("afmeldmail wordt verstuurd als een gebruiker wordt verwijderd", async ({ page }) => {
  const stamp = Date.now();
  const email = `bkmkeukenmontage+afmtest${stamp}@gmail.com`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { data: maak } = await admin.auth.admin.createUser({ email, email_confirm: true });
  const uid = maak!.user.id;
  await admin
    .from("profielen")
    .insert({ id: uid, rol: "monteur", naam: `Afmtest ${stamp}`, opdrachtgever_id: zaak?.id ?? null });

  const res = await page.request.delete(`/api/gebruikers/${uid}`);
  expect(res.ok()).toBeTruthy(); // verwijdert het account + stuurt de afmeldmail
  accUid = (await zoekUidOpEmail(email)) ?? ""; // mocht het account toch nog bestaan, ruim het op
  console.log(`AFMELDMAIL email=${email}`);
});
