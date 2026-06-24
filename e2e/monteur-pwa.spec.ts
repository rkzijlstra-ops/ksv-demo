import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR as MONTEUR_ACC } from "./test-env";
import zlib from "node:zlib";
import { wachtOpHydratie } from "./hydratie";

/**
 * Monteur-PWA-flows in de browser: een melding maken met een foto (veilig, geen mail). De foto wordt
 * client-side gecomprimeerd en echt naar Supabase Storage geupload, daarna komt de melding als
 * kind-rij bij de opdracht. Draait onder de monteur-sessie. Seedt eigen opdracht en ruimt die op.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_SECRET;
const RK = MONTEUR_ACC.uid;

const admin: SupabaseClient = createClient(URL_, KEY, { auth: { persistSession: false } });
const db: Db = createDb({ url: URL_, secretKey: KEY });

// Gegenereerde geldige PNG (16x16 effen kleur) als testfoto, zodat createImageBitmap hem decodeert.
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
  ihdr[8] = 8; // bitdepth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter byte
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 4) + 1 + x * 4;
      raw[o] = 200;
      raw[o + 1] = 60;
      raw[o + 2] = 50;
      raw[o + 3] = 255;
    }
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PNG = maakPng(16, 16);

let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `PWA ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `R${Date.now()}`,
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
  // Oplevering + kind-meldingen eerst, dan de opdracht (storage-objecten van foto/handtekening laten
  // we staan; throwaway, pre-Ed).
  await admin.from("opleveringen").delete().eq("opdracht_id", opdrachtId);
  await admin.from("meldingen").delete().eq("opdracht_id", opdrachtId);
  await admin.from("meldingen").delete().eq("id", opdrachtId);
});

test("monteur maakt een melding met een foto, die als kind-rij bij de opdracht komt", async ({ page }) => {
  // Stond eerder in CI op skip ("foto-compressie hangt"); dat bleek dezelfde hydratie-race als de
  // andere upload-tests (de pagina bleef in de beginstaat, niet in "Foto's verwerken..."). Met
  // wachtOpHydratie hieronder is de race weg, dus de skip is eraf.
  await page.goto(`/opdracht/${opdrachtId}/melding`);
  await wachtOpHydratie(page); // pas na hydratie is de change-handler van de foto-input gekoppeld

  // Foto kiezen (galerij-input) -> compressie + upload naar storage -> thumbnail verschijnt.
  await page.locator('input[type="file"][multiple]').setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toBeVisible({ timeout: 20_000 });

  await page.getByLabel("Wat is er aan de hand?").fill("E2E melding met foto");
  await page.getByRole("button", { name: "Toevoegen aan rapport" }).click();

  // Terug op de opdracht-pagina, en in de database staat de monteur-melding met een foto.
  await expect(page).toHaveURL(new RegExp(`/opdracht/${opdrachtId}$`));

  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("meldingen")
          .select("bron, ruwe_tekst, foto_urls")
          .eq("opdracht_id", opdrachtId)
          .eq("bron", "monteur");
        return data ?? [];
      },
      { timeout: 12_000, intervals: [500] },
    )
    .toHaveLength(1);

  const { data } = await admin
    .from("meldingen")
    .select("ruwe_tekst, foto_urls")
    .eq("opdracht_id", opdrachtId)
    .eq("bron", "monteur")
    .single();
  expect(data?.ruwe_tekst).toBe("E2E melding met foto");
  expect((data?.foto_urls ?? []).length).toBeGreaterThanOrEqual(1);
});

test("monteur legt de oplevering vast: eindstaat-foto en handtekening (concept, geen verzending)", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page); // pas na hydratie is de change-handler van de foto-input gekoppeld

  // Eindstaat-foto: upload -> thumbnail. Dit slaat meteen een concept-oplevering op.
  await page.locator('input[type="file"][multiple]').first().setInputFiles({
    name: "eindstaat.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toBeVisible({ timeout: 20_000 });

  // Tekenen vóór de akkoord-keuze toont een bevestiging; die accepteren we (monteur tekent toch).
  page.on("dialog", (d) => d.accept());

  // Handtekening: open de modal, teken een streep op het canvas, klik Klaar.
  await page.getByRole("button", { name: "Klant laten tekenen" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas niet gevonden");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 70, { steps: 8 });
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Klaar", exact: true }).click();

  // De handtekening wordt geupload en "Gezet"; we verzenden NIET (zou mailen).
  await expect(page.getByText("Gezet")).toBeVisible({ timeout: 20_000 });

  // In de database staat een concept-oplevering met een eindstaat-foto en een handtekening.
  await expect
    .poll(
      async () => {
        const { data } = await admin
          .from("opleveringen")
          .select("handtekening_url")
          .eq("opdracht_id", opdrachtId)
          .maybeSingle();
        return data?.handtekening_url ?? null;
      },
      { timeout: 20_000, intervals: [500] },
    )
    .toBeTruthy();

  const { data } = await admin
    .from("opleveringen")
    .select("eindstaat_foto_urls, handtekening_url")
    .eq("opdracht_id", opdrachtId)
    .single();
  expect((data?.eindstaat_foto_urls ?? []).length).toBeGreaterThanOrEqual(1);
  expect(data?.handtekening_url).toBeTruthy();
});
