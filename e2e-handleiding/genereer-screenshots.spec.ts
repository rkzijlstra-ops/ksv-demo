import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb } from "@/lib/db";
import { HANDLEIDING_ONDERWERPEN } from "@/lib/handleiding-stappen";
import { WELKOM_WEG_KEY } from "@/lib/onboarding";
import { SUPABASE_URL, SUPABASE_SECRET, MONTEUR } from "../e2e/test-env";

/**
 * Genereert de handleiding-screenshots. Geen gewone test: het is gereedschap. Seedt één vaste
 * demo-opdracht (nepgegevens) toegewezen aan de testmonteur, loopt de stappen uit de databron af
 * en schrijft per stap een screenshot naar public/handleiding/. Ruimt de demo-opdracht altijd op.
 * Faalt luid (exit niet-nul) als een stap misgaat, met de bestandsnaam erbij, zodat plaatjes niet
 * stil verouderen.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
const db = createDb({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET });
const UIT = path.join(process.cwd(), "public", "handleiding");

test("genereer handleiding-screenshots", async ({ page }) => {
  test.slow();
  mkdirSync(UIT, { recursive: true });

  // Het welkom-/onboarding-blok op de werkpool hoort niet op de handleiding-plaatjes (de handleiding
  // ís de uitleg). Onderdruk het door de "weggeklikt"-markering vooraf te zetten.
  await page.addInitScript((k) => {
    try {
      localStorage.setItem(k as string, "1");
    } catch {
      // geen localStorage beschikbaar: dan staat het blok er even op, geen ramp.
    }
  }, WELKOM_WEG_KEY);

  // Een eventuele restant-demo van een afgebroken run eerst opruimen (idempotent).
  await admin.from("meldingen").delete().eq("referentienummer", "DEMO-001");

  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: "Fam. Jansen",
    klant_adres: "Voorbeeldstraat 1, Voorschoten",
    referentienummer: "DEMO-001",
    adviseur: null,
    // Nep-nummer, zodat de knoppen "bellen" en "WhatsApp" op de opdracht-detail verschijnen
    // (die tonen alleen als er een telefoonnummer bekend is) en in stap 2 op de screenshot staan.
    klant_telefoon: "0612345678",
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });

  const fouten: string[] = [];
  try {
    for (const stap of HANDLEIDING_ONDERWERPEN) {
      if (stap.nieuw) continue; // nog geen seedbaar scherm; pagina toont placeholder
      try {
        await page.goto(stap.route.replace(":id", id));
        // Niet op "networkidle" wachten: deze app pollt de database, dus dat moment komt nooit en
        // de generator zou eindeloos blijven hangen. "domcontentloaded" rondt wel af; daarna een
        // korte vaste pauze zodat de inhoud (na het skelet-laadscherm) echt staat.
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1200);
        // De Next.js dev-indicator (het "N"-knopje linksonder) hoort niet op een handleiding-plaatje.
        // Verbergen via de host van de dev-portal; moet per pagina opnieuw, want goto verlaat de vorige.
        await page.addStyleTag({
          content:
            "nextjs-portal,[data-next-badge-root],[data-nextjs-dev-tools-button],#__next-build-watcher{display:none!important}",
        });
        if (stap.interactie === "handtekening-modal") {
          // De knop "Klant laten tekenen" opent de teken-popup (HandtekeningModal). Wacht tot de
          // popup-titel zichtbaar is, dan staat de popup gegarandeerd op de screenshot.
          await page.getByRole("button", { name: /klant laten tekenen/i }).click({ timeout: 6000 });
          await page.getByText(/laat de klant hier tekenen/i).waitFor({ state: "visible", timeout: 6000 });
          await page.waitForTimeout(400);
        } else if (stap.interactie === "interne-notitie") {
          // Scroll naar het (dichtgeklapte) interne-notitie-blok zodat het op de screenshot staat.
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
          await page
            .getByText(/document/i)
            .first()
            .scrollIntoViewIfNeeded({ timeout: 6000 })
            .catch(() => {});
          await page.waitForTimeout(400);
        }
        // De handtekening-modal is een volledig-scherm-overlay: die leggen we als heel viewport vast.
        // Alle andere schermen snijden we bij op de hoofd-inhoud, zodat er geen lege witruimte
        // onder de schermafbeelding staat.
        if (stap.interactie === "handtekening-modal") {
          await page.screenshot({ path: path.join(UIT, stap.bestand) });
        } else {
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
    await admin.from("meldingen").delete().eq("id", id);
  }

  if (fouten.length) {
    throw new Error(`Screenshots mislukt voor ${fouten.length} stap(pen):\n${fouten.join("\n")}`);
  }
});
