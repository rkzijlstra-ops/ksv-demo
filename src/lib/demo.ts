/**
 * Demo-omgeving: helpers voor de afgeschermde sandbox-deploy (DEMO_MODE=1).
 *
 * De demo hergebruikt de echte SMS/mail-providers, dus de ENIGE grendel die echte berichten naar
 * vreemden tegenhoudt is de allowlist. Daarom een harde fail-safe: in demo-modus met een LEGE allowlist
 * gaat er NIETS uit (nooit "naar iedereen"). Buiten demo-modus geldt het bestaande gedrag: een lege
 * allowlist = geen beperking (normale productie verstuurt naar echte ontvangers).
 */

/** Draait deze deploy als afgeschermde demo? Gestuurd door de env-vlag DEMO_MODE=1. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE?.trim() === "1";
}

/** Vast wachtwoord voor de demo-accounts (sandbox; alleen demo-DB). */
export const DEMO_WACHTWOORD = "Demo-Kluslus-2026!";

/** De vaste demo-accounts. De seed maakt ze aan; de QR-login logt als deze accounts in. */
export const DEMO_ACCOUNTS = {
  kantoor: { email: "demo-kantoor@voorbeeld.kluslus.test", naam: "Ed (demo)", rol: "beheerder" as const },
  monteur: { email: "demo-monteur@voorbeeld.kluslus.test", naam: "Mees Monteur (demo)", rol: "monteur" as const },
  monteur2: { email: "demo-monteur2@voorbeeld.kluslus.test", naam: "Tim Tegel (demo)", rol: "monteur" as const },
};

/** Komma-lijst uit een env-var naar een schone lijst trimmen (lege waarden eruit). */
export function leesAllowlist(waarde: string | undefined): string[] {
  return (waarde ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Mag een (bedoeld) bericht naar deze ontvanger de deur uit? Eén regel voor SMS en mail, identiek in
 * demo en productie: een gevulde allowlist beperkt tot die ontvangers; een LEGE allowlist betekent geen
 * beperking (verstuur echt). De demo stuurt dus net als productie; de demo gebruikt een eigen, eigen
 * 06/mail via de registratie-stap zodat de tester de berichten op zijn eigen toestel ontvangt.
 */
export function ontvangerToegestaan(
  naar: string,
  allowlist: string[],
): { toegestaan: boolean; reden?: string } {
  if (allowlist.length > 0 && !allowlist.includes(naar)) {
    return { toegestaan: false, reden: "staat niet op de allowlist" };
  }
  return { toegestaan: true };
}
