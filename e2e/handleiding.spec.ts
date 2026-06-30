import { test, expect } from "@playwright/test";
import { HANDLEIDING_ONDERWERPEN } from "@/lib/handleiding-stappen";

/**
 * De monteur bereikt de handleiding via het menu, ziet alle onderwerpen, en kan ze
 * openklappen (alles tegelijk of los). Draait onder de monteur-sessie; geen seed nodig.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("monteur opent de handleiding via het menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Kluspool")).toBeVisible();
  await page.getByRole("button", { name: /menu voor/i }).click();
  await page.getByRole("menuitem", { name: /handleiding/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/handleiding");
  await expect(page.getByRole("heading", { name: "Handleiding", level: 1 })).toBeVisible();
});

test("alle onderwerp-titels zijn zichtbaar, ook ingeklapt", async ({ page }) => {
  await page.goto("/handleiding");
  for (const o of HANDLEIDING_ONDERWERPEN) {
    await expect(page.getByRole("heading", { name: o.titel, level: 3 })).toBeVisible();
  }
});

test("Alles openklappen toont de inhoud en klapt weer dicht", async ({ page }) => {
  await page.goto("/handleiding");
  const eerste = HANDLEIDING_ONDERWERPEN[0];
  const knop = page.getByRole("button", { name: /alles openklappen/i });
  await expect(knop).toBeVisible();
  await knop.click();
  if (eerste.intro) await expect(page.getByText(eerste.intro, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /alles inklappen/i }).click();
  if (eerste.intro) await expect(page.getByText(eerste.intro, { exact: false })).toHaveCount(0);
});

test("een los onderwerp openklappen toont alleen dat onderwerp", async ({ page }) => {
  await page.goto("/handleiding");
  const doel = HANDLEIDING_ONDERWERPEN.find((o) => o.intro)!;
  await page.getByRole("button", { name: doel.titel }).click();
  await expect(page.getByText(doel.intro!, { exact: false })).toBeVisible();
});
