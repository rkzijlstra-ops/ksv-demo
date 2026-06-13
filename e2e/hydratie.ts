import { expect, type Page } from "@playwright/test";

/**
 * Wacht tot React in de browser is gehydrateerd. Het HydratieKlaar-component (in de upload-componenten)
 * zet dan `data-hydrated="1"` op het <html>-element. Roep dit aan na page.goto en vóór setInputFiles op
 * een file-input: React koppelt de change-handler van die input pas bij hydratie, dus een file die eerder
 * wordt aangeleverd verliest het change-event en de upload gebeurt niet (de bron van flaky upload-tests).
 */
export async function wachtOpHydratie(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "1", { timeout: 15_000 });
}
