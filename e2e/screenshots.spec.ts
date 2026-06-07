import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { maandagVan, weekDagen } from "@/lib/planbord";
import { createStorage } from "@/lib/storage";
import { SUPABASE_URL, SUPABASE_SECRET, BEHEERDER, MONTEUR } from "./test-env";
import zlib from "node:zlib";

/** Minimale gekleurde PNG voor een echte foto/handtekening in het rapport. */
function maakPng(w: number, h: number, r: number, g: number, b: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (1 + w * 4) + 1 + x * 4; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/**
 * Visuele review: seedt een RIJKE situatie (meerdere monteurs, veel opdrachten in alle statussen, vol
 * planbord) en maakt screenshots van de kernschermen, zodat Reinier ziet hoe het bij meer data toont.
 * Draait alleen met SHOTS=1 (niet in de poort):  SHOTS=1 npx playwright test e2e/screenshots.spec.ts
 * Screenshots komen in ./screenshots (gitignored).
 */

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const store = createStorage({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });

const PREFIX = "DEMO";
// Extra monteurs als echte auth-users (profielen hebben een FK naar auth.users), in beforeAll gemaakt.
const EXTRA_MONTEURS = [
  { email: "demo-monteur-jan@kluslus.test", naam: "Jan Bakker", id: "" },
  { email: "demo-monteur-piet@kluslus.test", naam: "Piet de Vries", id: "" },
  { email: "demo-monteur-klaas@kluslus.test", naam: "Klaas Jansen", id: "" },
];

function vandaagISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ankerVoorDatum(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

let detailId = ""; // een opdracht met logboek-gebeurtenissen, voor de detail-screenshot
let rapportId = ""; // een opgeleverde opdracht met foto's/handtekening, voor het rapport-screenshot

test.beforeAll(async () => {
  test.skip(!process.env.SHOTS, "Screenshot-run; draai met SHOTS=1");
  const zaak = await db.getStandaardOpdrachtgever();
  const zaakId = zaak?.id ?? null;
  const maandag = maandagVan(ankerVoorDatum(vandaagISO()));
  const dagen = weekDagen(maandag);

  // Extra monteurs als echte auth-users + profielen, zodat het planbord meerdere rijen heeft.
  for (const m of EXTRA_MONTEURS) {
    const { data: lijst } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const bestaand = lijst?.users?.find((u) => u.email?.toLowerCase() === m.email);
    m.id = bestaand?.id ?? (await admin.auth.admin.createUser({ email: m.email, email_confirm: true })).data.user!.id;
    await admin.from("profielen").upsert({ id: m.id, rol: "monteur", naam: m.naam, opdrachtgever_id: zaakId }, { onConflict: "id" });
  }
  // Namen moeten matchen met de profiel-namen (de planbord-rij toont de profiel-naam).
  const alleMonteurs = [
    { id: MONTEUR.uid, naam: "E2E Monteur" },
    ...EXTRA_MONTEURS.map((m) => ({ id: m.id, naam: m.naam })),
  ];

  let n = 0;
  async function maak(klant: string, opts: Partial<{ status: string; monteurIdx: number; dag: number; tijd: string | null; duur: number; userId: string }> = {}) {
    const { id } = await db.createOpdracht({
      documenttype: n % 2 === 0 ? "orderbevestiging" : "werkbon_service",
      klant_naam: `${PREFIX} ${klant}`,
      klant_adres: `Dorpsstraat ${10 + n}, Voorschoten`,
      referentienummer: `${7400 + n}`,
      adviseur: null,
      klant_telefoon: "0612345678",
      leverweek: 20 + (n % 6),
      keukenzaak: "Keukenstudio Voorschoten",
      user_id: opts.userId ?? BEHEERDER.uid,
      toegewezen_aan: opts.monteurIdx != null ? alleMonteurs[opts.monteurIdx].id : null,
      opdrachtgever_id: zaakId,
    });
    n++;
    if (opts.monteurIdx != null && opts.dag != null) {
      const m = alleMonteurs[opts.monteurIdx];
      await db.planOpdracht(id, { toegewezen_aan: m.id, monteur_naam: m.naam, startdatum: dagen[opts.dag], starttijd: opts.tijd ?? null, duur_dagen: opts.duur ?? 1 });
      if (opts.status === "gepland" || opts.status === "bevestigd") {
        await db.markeerVerzonden(id, { toegewezen_aan: m.id, monteur_naam: m.naam, startdatum: dagen[opts.dag], starttijd: opts.tijd ?? null });
      }
      if (opts.status === "bevestigd") await db.bevestigOntvangst(id);
    }
    return id;
  }

  // Pool (te plannen)
  await maak("Fam. Visser");
  await maak("Fam. Smit");
  await maak("De Wit keuken");
  // Planbord, verspreid over monteurs/dagen/statussen
  await maak("Fam. Bakker", { status: "bevestigd", monteurIdx: 0, dag: 0, tijd: "08:00" });
  await maak("Fam. Mulder", { status: "gepland", monteurIdx: 0, dag: 2, duur: 2 });
  await maak("Fam. Koster", { status: "bevestigd", monteurIdx: 1, dag: 0, duur: 3 });
  await maak("Fam. Hendriks", { status: "gepland", monteurIdx: 1, dag: 3, tijd: "13:00" });
  await maak("Fam. Groot", { status: "bevestigd", monteurIdx: 2, dag: 1, duur: 2 });
  await maak("Fam. Dekker", { status: "gepland", monteurIdx: 2, dag: 4, tijd: "09:30" });
  await maak("Fam. Bos", { status: "bevestigd", monteurIdx: 3, dag: 0, tijd: "10:00" });
  await maak("Fam. Vos", { status: "gepland", monteurIdx: 3, dag: 2 });
  // RK eigen ingeschoten klus (binnen, prullenbak)
  await maak("Eigen klus Boon", { userId: MONTEUR.uid, monteurIdx: 0, dag: 1, status: "bevestigd" });

  // Opgeleverde klus met oplevering (echte foto's + handtekening) voor het rapport-screenshot.
  const fotoKleuren: [number, number, number][] = [[90, 150, 110], [120, 100, 170], [200, 150, 80]];
  const fotoUrls: string[] = [];
  for (const [r, g, b] of fotoKleuren) {
    fotoUrls.push((await store.uploadFoto(maakPng(240, 170, r, g, b), "image/png")).url);
  }
  const handtekeningUrl = (await store.uploadFoto(maakPng(220, 90, 245, 247, 250), "image/png")).url;
  // Afzender op het monteur-profiel zetten zodat het rapport-screenshot de echte afzender toont.
  await admin.from("profielen").update({
    bedrijfsnaam: "BKM Keukenmontage", telefoon: "06-31665814", contact_email: "bkmkeukenmontage@gmail.com",
  }).eq("id", MONTEUR.uid);
  rapportId = await maak("Fam. de Boer", { monteurIdx: 0, dag: 0, status: "bevestigd" });
  await db.upsertOpleveringConcept({
    opdracht_id: rapportId,
    eindstaat_foto_urls: fotoUrls,
    video_url: null,
    opmerking: "Keuken compleet gemonteerd en schoon opgeleverd. Klant tevreden. Eén lade liep stroef; geleider afgesteld en smeermiddel achtergelaten.",
    rapport_email: null,
    user_id: MONTEUR.uid,
    handtekening_url: handtekeningUrl,
  });
  await db.markeerOpgeleverd(rapportId, "https://storage.example/rapport-deboer.pdf");

  // Een opdracht met logboek + terugmelding voor de detail-screenshot
  detailId = await maak("Fam. Jansen-teruggemeld", { status: "bevestigd", monteurIdx: 0, dag: 3 });
  await db.markeerTeruggemeld(detailId, { reden: "klant_niet_thuis", toelichting: "Driemaal aangebeld, niemand thuis. Buurman wist van niets." });
  await db.logGebeurtenis({ opdracht_id: detailId, actie: "teruggemeld", door_id: MONTEUR.uid, door_naam: "Rein RK", door_rol: "monteur", details: { reden: "klant_niet_thuis", toelichting: "Driemaal aangebeld, niemand thuis." } });
});

test.afterAll(async () => {
  if (!process.env.SHOTS) return;
  await admin.from("profielen").update({ bedrijfsnaam: null, telefoon: null, contact_email: null }).eq("id", MONTEUR.uid);
  await admin.from("gebeurtenissen").delete().like("door_naam", "Rein RK");
  // Opdrachten met de DEMO-prefix opruimen.
  const { data } = await admin.from("meldingen").select("id").like("klant_naam", `${PREFIX}%`);
  for (const r of data ?? []) {
    await admin.from("gebeurtenissen").delete().eq("opdracht_id", r.id);
    await admin.from("opleveringen").delete().eq("opdracht_id", r.id);
    await admin.from("meldingen").delete().eq("id", r.id);
  }
  for (const m of EXTRA_MONTEURS) {
    if (m.id) {
      await admin.from("profielen").delete().eq("id", m.id);
      await admin.auth.admin.deleteUser(m.id).catch(() => {});
    }
  }
});

test.describe("kantoor (desktop)", () => {
  test.use({ storageState: "e2e/.auth/beheerder.json", viewport: { width: 1440, height: 1000 } });

  test("dashboard vol", async ({ page }) => {
    test.skip(!process.env.SHOTS, "SHOTS=1");
    await page.goto("/dashboard");
    await expect(page.getByText("Te doen", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/01-dashboard-vol.png", fullPage: true });
  });

  test("planbord vol", async ({ page }) => {
    test.skip(!process.env.SHOTS, "SHOTS=1");
    await page.goto("/planbord");
    await expect(page.getByRole("heading", { name: "Planbord" })).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/02-planbord-vol.png", fullPage: true });
  });

  test("opdracht-detail met logboek", async ({ page }) => {
    test.skip(!process.env.SHOTS || !detailId, "SHOTS=1");
    await page.goto(`/dashboard/opdracht/${detailId}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/03-opdracht-detail-logboek.png", fullPage: true });
  });
});

test.describe("monteur (mobiel)", () => {
  test.use({ storageState: "e2e/.auth/monteur.json", viewport: { width: 390, height: 844 } });

  test("werkpool met meerdere opdrachten", async ({ page }) => {
    test.skip(!process.env.SHOTS, "SHOTS=1");
    await page.goto("/");
    await expect(page.getByText("Werkpool")).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/04-werkpool-monteur.png", fullPage: true });
  });
});

test.describe("opleverrapport (preview)", () => {
  test.use({ storageState: "e2e/.auth/monteur.json", viewport: { width: 800, height: 1100 } });

  test("rapport-preview met foto's en handtekening", async ({ page }) => {
    test.skip(!process.env.SHOTS || !rapportId, "SHOTS=1");
    await page.goto(`/opdracht/${rapportId}/rapport`);
    await expect(page.getByText("Opleverrapport", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "screenshots/07-opleverrapport.png", fullPage: true });
  });
});

test.describe("kantoor (mobiel meekijken)", () => {
  test.use({ storageState: "e2e/.auth/beheerder.json", viewport: { width: 390, height: 844 } });

  test("dashboard op mobiel", async ({ page }) => {
    test.skip(!process.env.SHOTS, "SHOTS=1");
    await page.goto("/dashboard");
    await expect(page.getByText("Te doen", { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/05-dashboard-mobiel.png", fullPage: true });
  });

  test("planbord op mobiel (Ed kijkt even mee)", async ({ page }) => {
    test.skip(!process.env.SHOTS, "SHOTS=1");
    await page.goto("/planbord");
    await expect(page.getByRole("heading", { name: "Planbord" })).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "screenshots/06-planbord-mobiel.png", fullPage: true });
  });
});
