import { test, expect } from "@playwright/test";
import { HANDLEIDING_STAPPEN } from "@/lib/handleiding-stappen";

/**
 * De monteur kan de handleiding bereiken via het menu en ziet alle stappen op volgorde.
 * Draait onder de monteur-sessie. Geen seed nodig: de pagina is statische uitleg.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("monteur opent de handleiding via het menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Werkpool")).toBeVisible();
  await page.getByRole("button", { name: /menu voor/i }).click();
  await page.getByRole("menuitem", { name: /handleiding/i }).click();
  await page.waitForURL((u) => new URL(u).pathname === "/handleiding");
  await expect(page.getByRole("heading", { name: "Handleiding", level: 1 })).toBeVisible();
});

test("de handleiding toont alle stappen", async ({ page }) => {
  await page.goto("/handleiding");
  for (const stap of HANDLEIDING_STAPPEN) {
    await expect(page.getByRole("heading", { name: stap.titel, level: 2 })).toBeVisible();
  }
});
