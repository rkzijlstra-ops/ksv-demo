import { test, expect } from "@playwright/test";

/**
 * De werkpool toont een onboarding-blok dat naar de handleiding leidt (welkom-variant bij een lege
 * werkpool, compacte tip als er klussen zijn). "Niet meer tonen" verbergt het en onthoudt dat per
 * toestel (localStorage), dus ook na herladen. Draait onder de monteur-sessie.
 */
test.use({ storageState: "e2e/.auth/monteur.json" });

test("werkpool-onboarding leidt naar de handleiding en onthoudt 'niet meer tonen'", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Werkpool")).toBeVisible();

  // Het blok is er, met een link naar de handleiding en een 'Niet meer tonen'.
  const handleidingLink = page.getByRole("link", { name: /handleiding/i });
  await expect(handleidingLink).toBeVisible();
  const nietMeer = page.getByRole("button", { name: "Niet meer tonen" });
  await expect(nietMeer).toBeVisible();

  // Wegklikken verbergt het meteen.
  await nietMeer.click();
  await expect(page.getByRole("button", { name: "Niet meer tonen" })).toHaveCount(0);

  // En het blijft weg na herladen (per toestel onthouden).
  await page.reload();
  await expect(page.getByText("Werkpool")).toBeVisible();
  await expect(page.getByRole("button", { name: "Niet meer tonen" })).toHaveCount(0);
});
