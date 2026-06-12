import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb } from "@/lib/db";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";
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

  // Een eventuele restant-demo van een afgebroken run eerst opruimen (idempotent).
  await admin.from("meldingen").delete().eq("referentienummer", "DEMO-001");

  const zaak = await db.getStandaardOpdrachtgever();
  const { id } = await db.createOpdracht({
    documenttype: "werkbon_service",
    klant_naam: "Fam. Jansen",
    klant_adres: "Voorbeeldstraat 1, Voorschoten",
    referentienummer: "DEMO-001",
    adviseur: null,
    klant_telefoon: null,
    leverweek: null,
    keukenzaak: "Keukenstudio Voorschoten",
    user_id: MONTEUR.uid,
    toegewezen_aan: MONTEUR.uid,
    opdrachtgever_id: zaak?.id ?? null,
  });

  const fouten: string[] = [];
  try {
    for (const stap of HANDLEIDING_STAPPEN) {
      try {
        await page.goto(stap.route.replace(":id", id));
        await page.waitForLoadState("networkidle");
        if (stap.interactie === "handtekening-modal") {
          await page.getByRole("button", { name: /handtekening/i }).first().click();
          await page.waitForTimeout(400);
        } else if (stap.interactie === "scroll-onder") {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(400);
        }
        await page.screenshot({ path: path.join(UIT, stap.bestand) });
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
