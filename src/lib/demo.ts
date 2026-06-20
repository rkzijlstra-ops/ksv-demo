/**
 * Demo-omgeving: helpers voor de afgeschermde sandbox-deploy (DEMO_MODE=1).
 *
 * De demo/test-omgeving hergebruikt de echte SMS/mail-providers. De grendel die berichten naar vreemden
 * tegenhoudt is de ALLOWLIST (SMS_ALLOWLIST / MAIL_ALLOWLIST): een gevulde lijst beperkt tot precies die
 * ontvangers. LET OP: een LEGE allowlist betekent GEEN beperking (verstuurt naar de echte ontvanger),
 * ook in demo-modus. Er is bewust GEEN "lege lijst = niets versturen"-fail-safe in de code (dat stond hier
 * eerder beschreven maar is nooit zo gebouwd). In een afgeschermde omgeving vul je dus altijd de allowlist
 * met je eigen 06/mail. Wil je een kanaal helemaal stilzetten, gebruik dan de aan/uit-knop
 * SMS_DRY_RUN / MAIL_DRY_RUN (=1 → niets versturen, alleen loggen).
 */

/** Draait deze deploy als afgeschermde demo? Gestuurd door de env-vlag DEMO_MODE=1. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE?.trim() === "1";
}

/** Vast wachtwoord voor de demo-accounts (sandbox; alleen demo-DB). */
export const DEMO_WACHTWOORD = "Demo-Kluslus-2026!";

/**
 * Mag de test-wachtwoordlogin verschijnen? Alleen buiten productie (branch-previews + lokaal), nooit op de
 * prod- of demo-deploy (die draaien als Vercel-productie). Zo kan Reinier in een preview inloggen zonder
 * Google/magic-link, maar bestaat de route in productie niet.
 */
export function isTestLoginActief(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

/**
 * Vaste test-accounts op de TEST-DB voor de test-wachtwoordlogin (alleen niet-productie). Dezelfde accounts
 * die `npm run setup:test` aanmaakt. De wachtwoorden mogen in de code: het zijn wegwerp-accounts op de
 * test-DB zonder echte data, net als DEMO_WACHTWOORD.
 */
export const TEST_LOGIN_ACCOUNTS = {
  kantoor: { email: "test-beheerder@kluslus.test", wachtwoord: "Testbeheerder1!" },
  monteur: { email: "test-monteur@kluslus.test", wachtwoord: "Testmonteur1!" },
} as const;

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
