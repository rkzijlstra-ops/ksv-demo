import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb } from "@/lib/db";
import { HANDLEIDING_ONDERWERPEN } from "@/lib/handleiding-stappen";
import { WELKOM_WEG_KEY } from "@/lib/onboarding";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "../e2e/test-env";

/**
 * Genereert de handleiding-screenshots. Geen gewone test: het is gereedschap. Seedt drie vaste
 * demo-klussen (nepgegevens, toegewezen aan de testmonteur), loopt de onderwerpen uit de databron af
 * en schrijft per onderwerp een screenshot naar public/handleiding/. Ruimt alles altijd op.
 * Faalt luid (exit niet-nul) als een onderwerp misgaat, met de bestandsnaam erbij, zodat plaatjes
 * niet stil verouderen.
 *
 * Drie klussen omdat sommige schermen een eigen toestand nodig hebben:
 * - DEMO-001: gewone open klus (opdrachtgever + telefoon + één bron-document). De meeste shots.
 * - DEMO-002: opgeleverd + vervolg nodig. Voor "Vervolg / opgeleverd".
 * - DEMO-003: eigen klus (geen opdrachtgever), zodat klant-levering aan kan. Voor "Klant-versie".
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const UIT = path.join(process.cwd(), "public", "handleiding");

// Interacties die een volledig-scherm-overlay tonen: die leggen we als heel viewport vast.
const OVERLAY = new Set(["handtekening-modal", "niet-doorgegaan-dialog", "documenten-blok"]);

const REFS = ["DEMO-001", "DEMO-002", "DEMO-003"];

test("genereer handleiding-screenshots", async ({ page }) => {
  test.slow();
  mkdirSync(UIT, { recursive: true });

  // Het welkom-/onboarding-blok op de werkpool hoort niet op de plaatjes (de handleiding ís de uitleg).
  await page.addInitScript((k) => {
    try {
      localStorage.setItem(k as string, "1");
    } catch {
      // geen localStorage: dan staat het blok er even op, geen ramp.
    }
  }, WELKOM_WEG_KEY);

  // Restanten van een afgebroken run opruimen (idempotent): documenten eerst, dan de klussen.
  const oude = await admin.from("meldingen").select("id").in("referentienummer", REFS);
  const oudeIds = (oude.data ?? []).map((r) => r.id as string);
  if (oudeIds.length) await admin.from("documenten").delete().in("opdracht_id", oudeIds);
  await admin.from("meldingen").delete().in("referentienummer", REFS);

  const zaak = await db.getStandaardOpdrachtgever();
  const basis = {
    documenttype: "werkbon_service" as const,
    klant_adres: "Voorbeeldstraat 1, Voorschoten",
    adviseur: null,
    // Nep-nummer zodat bellen/WhatsApp op de detailpagina verschijnen.
    klant_telefoon: "0612345678",
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
  };

  // DEMO-001: gewone open klus met opdrachtgever + één bron-document (werkbon).
  const { id: id1 } = await db.createOpdracht({
    ...basis,
    klant_naam: "Fam. Jansen",
    referentienummer: "DEMO-001",
    opdrachtgever_id: zaak?.id ?? null,
  });
  await db.addDocument({
    opdracht_id: id1,
    type: "pdf",
    bestandsnaam: "Werkbon Fam. Jansen.pdf",
    storage_pad: "handleiding/voorbeeld/werkbon.pdf",
    publieke_url: "/handleiding/voorbeeld/werkbon.pdf",
    referentienummer: "DEMO-001",
    is_primair: true,
    user_id: MONTEUR.uid,
  });

  // DEMO-002: opgeleverd + vervolg nodig (voor de detailpagina in opgeleverd-staat).
  const { id: id2 } = await db.createOpdracht({
    ...basis,
    klant_naam: "Fam. de Vries",
    referentienummer: "DEMO-002",
    opdrachtgever_id: zaak?.id ?? null,
  });
  await admin
    .from("meldingen")
    .update({
      opdracht_status: "opgeleverd",
      opgeleverd_at: new Date().toISOString(),
      afgerond_door_monteur_at: new Date().toISOString(),
      afgerond_vervolg_nodig: true,
    })
    .eq("id", id2);

  // DEMO-003: eigen klus (geen opdrachtgever) zodat klant-levering aan kan op het oplever-scherm.
  const { id: id3 } = await db.createOpdracht({
    ...basis,
    klant_naam: "Fam. Bakker",
    referentienummer: "DEMO-003",
    opdrachtgever_id: null,
  });

  const idVoor = (onderwerpId: string) =>
    onderwerpId === "vervolg-opgeleverd" ? id2 : onderwerpId === "klant-versie" ? id3 : id1;

  const fouten: string[] = [];
  try {
    for (const stap of HANDLEIDING_ONDERWERPEN) {
      if (stap.nieuw) continue; // nog geen seedbaar scherm; pagina toont placeholder
      try {
        await page.goto(stap.route.replace(":id", idVoor(stap.id)));
        // Niet op "networkidle" wachten: de app pollt de DB, dat moment komt nooit. "domcontentloaded"
        // rondt wel af; daarna een korte pauze zodat de inhoud (na het skelet) echt staat.
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1200);
        // De Next.js dev-indicator hoort niet op een plaatje; per pagina opnieuw verbergen.
        await page.addStyleTag({
          content:
            "nextjs-portal,[data-next-badge-root],[data-nextjs-dev-tools-button],#__next-build-watcher{display:none!important}",
        });

        if (stap.interactie === "handtekening-modal") {
          await page.getByRole("button", { name: /klant laten tekenen/i }).click({ timeout: 6000 });
          await page.getByText(/laat de klant hier tekenen/i).waitFor({ state: "visible", timeout: 6000 });
          await page.waitForTimeout(400);
        } else if (stap.interactie === "interne-notitie") {
          await page.getByText(/interne notitie/i).first().scrollIntoViewIfNeeded({ timeout: 6000 });
          await page.waitForTimeout(400);
        } else if (stap.interactie === "scroll-onder") {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(400);
        } else if (stap.interactie === "spoed-aan") {
          // Zet de spoed-schakelaar aan zodat de spoed-uitleg op de screenshot staat.
          const spoed = page.getByRole("switch", { name: /spoed/i }).or(page.getByLabel(/spoed/i));
          await spoed.first().click({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(400);
        } else if (stap.interactie === "documenten-blok") {
          // Open het bron-document in de in-app PDF-viewer (volledig scherm).
          await page.getByRole("button", { name: /openen/i }).first().click({ timeout: 6000 });
          await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 8000 });
          await page.waitForTimeout(900);
        } else if (stap.interactie === "klus-toevoegen-open") {
          // Klap het "Klus toevoegen"-formulier open op de kluspool.
          await page.getByRole("button", { name: /^klus toevoegen$/i }).click({ timeout: 6000 });
          await page.getByText(/voeg een pdf of foto/i).waitFor({ state: "visible", timeout: 6000 });
          await page.waitForTimeout(400);
        } else if (stap.interactie === "niet-doorgegaan-dialog") {
          // Open het "Niet doorgegaan"-venster (reden + toelichting) op het afsluit-keuzescherm.
          await page.getByRole("button", { name: /niet doorgegaan/i }).click({ timeout: 6000 });
          await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 6000 });
          await page.waitForTimeout(400);
        } else if (stap.interactie === "klant-toggle-scroll") {
          // Zet "Ook aan de klant opleveren" aan en scroll naar de klant-kant.
          await page.getByRole("button", { name: /ook aan de klant opleveren/i }).click({ timeout: 6000 });
          await page.waitForTimeout(400);
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(400);
        }

        if (OVERLAY.has(stap.interactie ?? "")) {
          await page.screenshot({ path: path.join(UIT, stap.bestand) });
        } else {
          // Bijsnijden op de hoofd-inhoud, zodat er geen lege witruimte onder de schermafbeelding staat.
          const hoogte = await page.evaluate(() => {
            const main = document.querySelector("main") ?? document.body;
            return Math.min(Math.ceil(main.getBoundingClientRect().height), 2200);
          });
          const breedte = page.viewportSize()?.width ?? 390;
          await page.screenshot({
            path: path.join(UIT, stap.bestand),
            clip: { x: 0, y: 0, width: breedte, height: Math.max(hoogte, 200) },
          });
        }
      } catch (e) {
        fouten.push(`${stap.bestand} (route ${stap.route}): ${(e as Error).message}`);
      }
    }
  } finally {
    const ids = [id1, id2, id3];
    await admin.from("documenten").delete().in("opdracht_id", ids);
    await admin.from("meldingen").delete().in("id", ids);
  }

  if (fouten.length) {
    throw new Error(`Screenshots mislukt voor ${fouten.length} onderwerp(en):\n${fouten.join("\n")}`);
  }
});
