import { test, expect } from "@playwright/test";

/**
 * Een beheerder is dubbelrol. Standaard landt hij op het dashboard (zijn echte thuis), ook bij het kale
 * adres. Zijn eigen kluspool blijft bereikbaar via ?kluspool=1 (link "Mijn kluspool" in het accountmenu).
 * Legacy ?werkpool=1 blijft ook werken voor oude links/bookmarks.
 */
test.use({ storageState: "e2e/.auth/beheerder.json" });

test("beheerder landt op het dashboard bij het kale adres", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((u) => new URL(u).pathname === "/dashboard");
});

test("beheerder bereikt zijn kluspool nog via ?werkpool=1 (legacy) en ?kluspool=1", async ({ page }) => {
  // Legacy-param: oude links/bookmarks moeten blijven werken.
  await page.goto("/?werkpool=1");
  // Geen redirect: de kluspool rendert (de monteur-invoerknop staat hier, op het dashboard heet 'ie anders).
  await expect(page.getByRole("button", { name: "Klus toevoegen" })).toBeVisible({ timeout: 15_000 });

  // Nieuwe canonieke param doet hetzelfde.
  await page.goto("/?kluspool=1");
  await expect(page.getByRole("button", { name: "Klus toevoegen" })).toBeVisible({ timeout: 15_000 });
});
