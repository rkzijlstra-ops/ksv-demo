import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import zlib from "node:zlib";

/**
 * De oplever-UI van de monteur, zonder te mailen: foto uploaden, handtekening op het canvas zetten en
 * een opmerking typen. De flow bewaart bij elke wijziging een concept (POST .../oplevering), los van
 * de "Versturen"-knop (die wél mailt en in mail.spec achter E2E_MAIL zit). We controleren dat het
 * concept in de database de foto-url, de handtekening-url en de opmerking bevat.
 */

test.use({ storageState: "e2e/.auth/monteur.json" });

const admin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db: Db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const RK = MONTEUR.uid;

// Minimale geldige PNG (16x16), zodat de echte upload naar storage een echt plaatje krijgt.
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

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `OPLEVER ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `OL${Date.now()}`,
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
  await admin.from("meldingen").delete().eq("id", opdrachtId);
});

async function conceptVan(id: string) {
  const { data } = await admin
    .from("opleveringen")
    .select("eindstaat_foto_urls, handtekening_url, opmerking")
    .eq("opdracht_id", id)
    .maybeSingle();
  return data;
}

// De concept-opslag is fire-and-forget (geen volgorde-garantie tussen opeenvolgende saves). Tussen de
// stappen wachten tot de tussenstand in de database staat serialiseert de saves, net als de echte
// cadans van een monteur (actie, verwerkt, volgende actie), en houdt de test deterministisch.
async function wachtConcept(id: string, predikaat: (c: Awaited<ReturnType<typeof conceptVan>>) => boolean) {
  await expect.poll(async () => predikaat(await conceptVan(id)), { timeout: 15_000, intervals: [400] }).toBe(true);
}

test("oplever-UI bewaart foto, handtekening en opmerking als concept (zonder mailen)", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/opleveren`);

  // Foto uploaden; "Foto verwijderen" verschijnt zodra de upload klaar is.
  await page.locator('input[type="file"][multiple]').first().setInputFiles({
    name: "eindstaat.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toBeVisible({ timeout: 20_000 });
  // Wacht tot de foto in het concept staat voordat de volgende save komt (serialiseren).
  await wachtConcept(opdrachtId, (c) => (c?.eindstaat_foto_urls?.length ?? 0) === 1);

  // Handtekening op het canvas zetten.
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
  // Wacht tot de handtekening in het concept staat (foto blijft erin) voordat de opmerking-save komt.
  await wachtConcept(opdrachtId, (c) => !!c?.handtekening_url && (c?.eindstaat_foto_urls?.length ?? 0) === 1);

  // Opmerking typen en blur (Tab), zodat het concept ook de opmerking bevat.
  const opmerking = `E2E oplevering ${Date.now()}`;
  await page.getByPlaceholder("Typ hier of spreek in…").fill(opmerking);
  await page.keyboard.press("Tab");

  // Database: het concept bevat nu de foto, de handtekening-url én de opmerking. Geen mail verstuurd.
  await expect
    .poll(
      async () => {
        const c = await conceptVan(opdrachtId);
        return {
          fotos: c?.eindstaat_foto_urls?.length ?? 0,
          handtekening: !!c?.handtekening_url,
          opmerking: c?.opmerking ?? "",
        };
      },
      { timeout: 15_000, intervals: [500] },
    )
    .toEqual({ fotos: 1, handtekening: true, opmerking });

  // De opdracht is NIET opgeleverd (we hebben niet verstuurd/gemaild).
  const { data: m } = await admin.from("meldingen").select("opdracht_status").eq("id", opdrachtId).single();
  expect(m?.opdracht_status).not.toBe("opgeleverd");
});
