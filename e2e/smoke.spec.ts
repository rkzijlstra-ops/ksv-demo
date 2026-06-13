import { test, expect } from "@playwright/test";

/**
 * Rooktest: bewijst dat de hele keten werkt (Playwright + lokale dev-server + programmatische login).
 * Als beheerder moeten de kantoor-schermen laden zonder naar /login te worden gestuurd.
 */
test("beheerder ziet het dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Klussen" })).toBeVisible();
});

test("beheerder ziet het planbord", async ({ page }) => {
  await page.goto("/planbord");
  await expect(page).toHaveURL(/\/planbord/);
  await expect(page.getByRole("heading", { name: "Planbord" })).toBeVisible();
});
