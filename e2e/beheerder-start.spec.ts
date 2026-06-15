import { test, expect } from "@playwright/test";

/**
 * Een beheerder is dubbelrol. Standaard landt hij op het dashboard (zijn echte thuis), ook bij het kale
 * adres. Zijn eigen werkpool blijft bereikbaar via ?werkpool=1 (link "Mijn werkpool" in het accountmenu).
 */
test.use({ storageState: "e2e/.auth/beheerder.json" });

test("beheerder landt op het dashboard bij het kale adres", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((u) => new URL(u).pathname === "/dashboard");
});

test("beheerder bereikt zijn werkpool nog via ?werkpool=1", async ({ page }) => {
  await page.goto("/?werkpool=1");
  // Geen redirect: de werkpool rendert (de monteur-invoerknop staat hier, op het dashboard heet 'ie anders).
  await expect(page.getByRole("button", { name: "Klus toevoegen" })).toBeVisible({ timeout: 15_000 });
});
