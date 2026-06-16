import { test, expect } from "@playwright/test";
import { wachtOpHydratie } from "./hydratie";
import { verseSessieCookies } from "./sessie-cookies";
import { MONTEUR, TEST_PW } from "./test-env";

/**
 * Uitloggen via het accountmenu moet betrouwbaar werken: sessie lokaal wissen + harde navigatie naar
 * /login. Voorheen kon een hangende globale signOut + router.refresh het uitloggen blokkeren.
 *
 * BELANGRIJK: deze test gebruikt NIET de gedeelde monteur.json-sessie. `signOut` revoket de sessie
 * server-side, dus zou hij de gedeelde sessie kapotmaken en elke volgende monteur-test naar /login
 * sturen. Daarom een eigen verse wegwerp-sessie (multi-sessie per user is toegestaan).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("monteur kan uitloggen en belandt op /login", async ({ page, context }) => {
  await context.addCookies(await verseSessieCookies(MONTEUR.email, TEST_PW));

  await page.goto("/");
  await wachtOpHydratie(page);

  await page.getByRole("button", { name: /Menu voor/ }).click();
  await page.getByRole("button", { name: "Uitloggen" }).click();

  await page.waitForURL((u) => new URL(u).pathname === "/login", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Inloggen" })).toBeVisible();
});
