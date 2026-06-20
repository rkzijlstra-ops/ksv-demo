import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDb, type Db } from "@/lib/db";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "./test-env";
import zlib from "node:zlib";
import { wachtOpHydratie } from "./hydratie";

/**
 * Per-foto upload in de oplever-flow (OpleverFotos): elke foto wordt los geüpload en meteen in het
 * concept opgeslagen, met zichtbare voortgang. We bewaken: 1) meerdere foto's tegelijk verschijnen
 * 1-voor-1 met een teller en landen allemaal in het concept; 2) een mislukte foto isoleert zich
 * (één tegel "opnieuw", de rest blijft) en kan opnieuw geüpload worden. Zonder mailen.
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

function fotoBestand(naam: string) {
  return { name: naam, mimeType: "image/png", buffer: PNG };
}

let opdrachtId = "";

test.beforeEach(async () => {
  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: `UPLOAD ${Date.now()}`,
    klant_adres: "Teststraat 1",
    referentienummer: `UP${Date.now()}`,
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

async function fotoUrlsVan(id: string): Promise<string[]> {
  const { data } = await admin
    .from("opleveringen")
    .select("eindstaat_foto_urls")
    .eq("opdracht_id", id)
    .maybeSingle();
  return Array.isArray(data?.eindstaat_foto_urls) ? data.eindstaat_foto_urls : [];
}

test("meerdere foto's verschijnen 1-voor-1 met teller en landen allemaal in het concept", async ({ page }) => {
  // Vertraag elke upload kunstmatig, zodat de teller zichtbaar wordt en de thumbnails na elkaar komen.
  await page.route("**/api/upload-foto", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });

  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  await page.locator('input[type="file"][multiple]').first().setInputFiles([
    fotoBestand("een.png"),
    fotoBestand("twee.png"),
    fotoBestand("drie.png"),
  ]);

  // De voortgangsteller verschijnt zolang er nog geüpload wordt.
  await expect(page.getByText(/Foto's uploaden/)).toBeVisible({ timeout: 10_000 });

  // Uiteindelijk staan er drie verwijder-knoppen (= drie klaar-thumbnails).
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(3, { timeout: 30_000 });

  // En het concept bevat drie foto-urls.
  await expect
    .poll(async () => (await fotoUrlsVan(opdrachtId)).length, { timeout: 15_000, intervals: [500] })
    .toBe(3);
});

test("waarschuwt vóór weg-navigeren met een lopende upload, en niet als er niets loopt", async ({ page }) => {
  // Vertraag de upload flink, zodat hij gegarandeerd nog loopt als we op Terug klikken.
  await page.route("**/api/upload-foto", async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });

  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  let dialogVerscheen = false;
  page.on("dialog", (d) => {
    dialogVerscheen = true;
    void d.dismiss();
  });

  await page.locator('input[type="file"][multiple]').first().setInputFiles([fotoBestand("een.png")]);
  await expect(page.getByText(/Foto's uploaden/)).toBeVisible({ timeout: 10_000 });

  // Tijdens de upload: Terug toont een bevestiging; bij weigeren blijven we op de pagina.
  await page.getByRole("link", { name: "Terug" }).click();
  await expect.poll(() => dialogVerscheen, { timeout: 5000 }).toBe(true);
  await expect(page).toHaveURL(/\/opleveren$/);

  // Upload afronden; daarna is er niets meer bezig en navigeert Terug zonder bevestiging.
  await page.unroute("**/api/upload-foto");
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(1, { timeout: 30_000 });

  dialogVerscheen = false;
  await page.getByRole("link", { name: "Terug" }).click();
  await expect(page).toHaveURL(/\/afronden$/, { timeout: 10_000 });
  expect(dialogVerscheen).toBe(false);
});

test("video die gekozen wordt tijdens een foto-upload wacht en start daarna vanzelf", async ({ page }) => {
  // Foto-uploads kunstmatig vertragen, zodat de video echt moet wachten.
  await page.route("**/api/upload-foto", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  // De video gaat rechtstreeks (cross-origin) naar Supabase Storage; die upload faken we, zodat de test
  // geen echte video-bucket nodig heeft en op het serialisatie-gedrag focust. Cross-origin XHR met
  // custom headers vraagt een CORS-preflight (OPTIONS); beide afhandelen met CORS-headers.
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,x-upsert,content-type",
  };
  await page.route("**/storage/v1/object/oplever-videos/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    // Lang ophouden, zodat de "Video uploaden…"-status stabiel zichtbaar is om te asserten dat de
    // video pas ná de foto's begon (de kern van de serialisatie).
    await new Promise((r) => setTimeout(r, 4000));
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify({ Key: "oplever-videos/clip.mp4" }),
    });
  });

  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  // Twee foto's starten (foto-upload bezig).
  await page.locator('input[type="file"][multiple]').first().setInputFiles([
    fotoBestand("een.png"),
    fotoBestand("twee.png"),
  ]);
  await expect(page.getByText(/Foto's uploaden/)).toBeVisible({ timeout: 10_000 });

  // Nu een video kiezen: die moet wachten tot de foto's klaar zijn.
  await page
    .locator('input[type="file"][accept="video/*"]')
    .setInputFiles({ name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from([0, 0, 0, 24]) });
  await expect(page.getByText(/Video wacht tot de foto's klaar zijn/)).toBeVisible({ timeout: 10_000 });

  // Zodra de foto's klaar zijn, start de video vanzelf: de wacht-status verdwijnt en het uploaden begint.
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByText(/Video wacht tot de foto's klaar zijn/)).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText("Video uploaden…")).toBeVisible({ timeout: 10_000 });
});

test("een foto die klaar is vóór het laden van het concept, gaat niet verloren", async ({ page }) => {
  // Vertraag het GETten van het concept, zodat de foto eerder klaar is dan de load. Dit oefent de
  // laad-race uit: zonder fix slikt de laad-gate de vroege opslag in of overschrijft de load hem.
  await page.route("**/oplevering", async (route) => {
    if (route.request().method() === "GET") {
      await new Promise((r) => setTimeout(r, 2500));
    }
    await route.continue();
  });

  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  // Meteen uploaden, vóór de concept-GET klaar is.
  await page.locator('input[type="file"][multiple]').first().setInputFiles([fotoBestand("vroeg.png")]);
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(1, { timeout: 30_000 });

  // Ook al liep de load nog: de foto moet alsnog in het concept landen.
  await expect.poll(async () => (await fotoUrlsVan(opdrachtId)).length, { timeout: 15_000 }).toBe(1);
});

test("een verwijderde foto verdwijnt uit het concept en roept de opruim-route aan", async ({ page }) => {
  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  await page.locator('input[type="file"][multiple]').first().setInputFiles([fotoBestand("een.png")]);
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(1, { timeout: 30_000 });
  await expect.poll(async () => (await fotoUrlsVan(opdrachtId)).length, { timeout: 15_000 }).toBe(1);

  // Verwijderen moet de opruim-route (DELETE) raken en de foto uit het concept halen.
  const delReq = page.waitForRequest(
    (r) => r.url().includes("/oplever-bestand") && r.method() === "DELETE",
    { timeout: 10_000 },
  );
  await page.getByRole("button", { name: "Foto verwijderen" }).click();
  await delReq;

  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(async () => (await fotoUrlsVan(opdrachtId)).length, { timeout: 15_000 }).toBe(0);
});

test("een mislukte foto isoleert zich en kan opnieuw, de rest blijft staan", async ({ page }) => {
  // Laat alleen de tweede upload-poging falen; de andere gaan door. Telt per request.
  let n = 0;
  await page.route("**/api/upload-foto", async (route) => {
    n += 1;
    if (n === 2) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boem" }) });
    } else {
      await route.continue();
    }
  });

  await page.goto(`/opdracht/${opdrachtId}/opleveren`);
  await wachtOpHydratie(page);

  await page.locator('input[type="file"][multiple]').first().setInputFiles([
    fotoBestand("een.png"),
    fotoBestand("twee.png"),
    fotoBestand("drie.png"),
  ]);

  // Twee foto's lukken (twee verwijder-knoppen) en één mislukt (één "opnieuw"-knop).
  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Foto opnieuw uploaden" })).toHaveCount(1, { timeout: 10_000 });
  expect((await fotoUrlsVan(opdrachtId)).length).toBe(2);

  // Hef de fout op en probeer de mislukte foto opnieuw: nu lukken alle drie.
  await page.unroute("**/api/upload-foto");
  await page.getByRole("button", { name: "Foto opnieuw uploaden" }).click();

  await expect(page.getByRole("button", { name: "Foto verwijderen" })).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Foto opnieuw uploaden" })).toHaveCount(0);
  await expect
    .poll(async () => (await fotoUrlsVan(opdrachtId)).length, { timeout: 15_000, intervals: [500] })
    .toBe(3);
});
