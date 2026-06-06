import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, APP_URL, MONTEUR as MONTEUR_ACC } from "./test-env";
import zlib from "node:zlib";

/**
 * Mail-end-to-end: de monteur levert een opdracht op (foto + handtekening) en VERSTUURT het rapport.
 * Het rapport-adres staat op een leesbaar test-adres (bkmkeukenmontage+kluslus@gmail.com), zodat het
 * rapport echt verstuurd wordt en daarna in de mailbox te controleren is (afzender, inhoud, map).
 * Draait tegen PRODUCTIE (Vercel), waar de juiste afzender (planning@kluslus.nl) is ingesteld.
 * Verstuurt ECHT een mail, dus alleen op aanvraag:
 *   E2E_MAIL=1 npx playwright test e2e/mail.spec.ts
 */

test.use({
  baseURL: APP_URL,
  // monteur.json (domain: "localhost", secure: false) i.p.v. monteur-prod.json (domain: "localhost:3001",
  // secure: true) omdat secure-cookies niet verstuurd worden over HTTP. page.goto() volgt deze regel
  // strikt; page.request.post() (beheerder-prod.json tests) is permissiever.
  storageState: "e2e/.auth/monteur.json",
});

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_SECRET;
const RK = MONTEUR_ACC.uid;
// Resend free tier staat alleen berichten toe aan het account-eigenaar-adres; plus-aliassen falen.
const RAPPORT_NAAR = "bkmkeukenmontage@gmail.com";

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

function maakPng(w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 4) + 1 + x * 4;
      raw[o] = 80;
      raw[o + 1] = 160;
      raw[o + 2] = 90;
      raw[o + 3] = 255;
    }
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PNG = maakPng(16, 16);

let opdrachtId = "";
let klant = "";

test.beforeEach(async () => {
  test.skip(!process.env.E2E_MAIL, "Mail-e2e verstuurt echt een mail; draai met E2E_MAIL=1");
  klant = `MAILTEST ${Date.now()}`;
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: klant,
    klant_adres: "Teststraat 1",
    referentienummer: `MT${Date.now()}`,
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: RK,
    toegewezen_aan: RK,
    opdrachtgever_id: zaak?.id ?? null,
  });
  opdrachtId = id;
});

test.afterEach(async () => {
  if (!opdrachtId) return;
  await admin.from("opleveringen").delete().eq("opdracht_id", opdrachtId);
  await admin.from("meldingen").delete().eq("opdracht_id", opdrachtId);
  await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("oplevering versturen mailt het rapport naar het ingestelde adres", async ({ page }) => {
  page.on("dialog", (d) => d.accept()); // eventuele waarschuwing (weinig foto's/geen video) accepteren
  await page.goto(`/opdracht/${opdrachtId}/opleveren`);

  await page.locator('input[type="file"][multiple]').first().setInputFiles({
    name: "eindstaat.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toBeVisible({ timeout: 20_000 });

  // Handtekening tekenen.
  await page.getByRole("button", { name: "Klant laten tekenen" }).click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas niet gevonden");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 110, box.y + 70, { steps: 8 });
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Klaar" }).click();
  await expect(page.getByText("Gezet")).toBeVisible({ timeout: 20_000 });

  // Rapport naar een leesbaar test-adres.
  await page.getByRole("combobox").selectOption({ label: "Anders (typ zelf)" });
  await page.getByPlaceholder("naam@keukenzaak.nl").fill(RAPPORT_NAAR);

  // Versturen: genereert de PDF en mailt.
  await page.getByRole("button", { name: "Versturen" }).click();
  await expect(page.getByText("Opgeleverd!")).toBeVisible({ timeout: 40_000 });

  // Appkant: opdracht is opgeleverd met een rapport.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("meldingen")
          .select("opdracht_status, rapport_url")
          .eq("id", opdrachtId)
          .single();
        return data;
      },
      { timeout: 12_000, intervals: [500] },
    )
    .toMatchObject({ opdracht_status: "opgeleverd" });

  console.log(`MAILVERSTUURD klant="${klant}" naar=${RAPPORT_NAAR}`);
});
