import { test, expect, type Page } from "@playwright/test";

/**
 * De demo-reis (uitstalraam), end-to-end tegen een DEMO_MODE-server: de beheerder meldt zich aan en
 * komt op het dashboard; een monteur meldt zich via de QR-pagina aan en komt in de werkpool; het
 * planbord toont de voorbeeld-monteurs; en "Speel opnieuw" houdt de beheerder ingelogd. Elke test
 * begint uitgelogd (geen storageState). De bevestig-dialoog van de reset accepteren we automatisch.
 */

const BEHEERDER = { naam: "Demo Beheerder", tel: "0612345678", mail: "demo-beheerder@example.com" };
const MONTEUR = { naam: "Demo Monteur", tel: "0612345679", mail: "demo-monteur-e2e@example.com" };

async function meldBeheerderAan(page: Page) {
  await page.goto("/demo/word-beheerder");
  await page.getByPlaceholder("Bijv. Ed").fill(BEHEERDER.naam);
  await page.getByPlaceholder("06...").fill(BEHEERDER.tel);
  await page.getByPlaceholder("jij@voorbeeld.nl").fill(BEHEERDER.mail);
  await page.getByRole("button", { name: /start de demo/i }).click();
  await page.waitForURL("**/dashboard");
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (d) => d.accept());
});

test("beheerder meldt zich aan en komt op het dashboard", async ({ page }) => {
  await meldBeheerderAan(page);
  await expect(page.getByText(/zo werkt de demo/i)).toBeVisible();
});

test("monteur meldt zich via de QR-pagina aan en komt in de werkpool", async ({ page }) => {
  await page.goto("/demo/word-monteur");
  await page.getByPlaceholder("Bijv. Jan").fill(MONTEUR.naam);
  await page.getByPlaceholder("06...").fill(MONTEUR.tel);
  await page.getByPlaceholder("jij@voorbeeld.nl").fill(MONTEUR.mail);
  await page.getByRole("button", { name: /doe mee/i }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(page.getByText(/werkpool/i)).toBeVisible();
});

test("planbord toont de voorbeeld-monteurs na aanmelden als beheerder", async ({ page }) => {
  await meldBeheerderAan(page);
  await page.goto("/planbord");
  await expect(page.getByText("Mees Monteur (demo)")).toBeVisible();
  await expect(page.getByText("Tim Tegel (demo)")).toBeVisible();
});

test("Speel opnieuw houdt je als beheerder op het dashboard", async ({ page }) => {
  await meldBeheerderAan(page);
  await page.getByRole("button", { name: /speel opnieuw/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Wacht tot de reset klaar is (knop weer actief), zodat we de demo-staat niet half achterlaten.
  await expect(page.getByRole("button", { name: /speel opnieuw/i })).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByText(/zo werkt de demo/i)).toBeVisible();
});
