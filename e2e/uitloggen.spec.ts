import { test, expect } from "@playwright/test";
import { wachtOpHydratie } from "./hydratie";

/**
 * Uitloggen via het accountmenu moet betrouwbaar werken: sessie lokaal wissen + harde navigatie naar
 * /login. Voorheen kon een hangende globale signOut + router.refresh het uitloggen blokkeren.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("monteur kan uitloggen en belandt op /login", async ({ page }) => {
  await page.goto("/");
  await wachtOpHydratie(page);

  await page.getByRole("button", { name: /Menu voor/ }).click();
  await page.getByRole("button", { name: "Uitloggen" }).click();

  await page.waitForURL((u) => new URL(u).pathname === "/login", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Inloggen" })).toBeVisible();
});
