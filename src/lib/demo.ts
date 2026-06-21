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
 * Mag de test-wachtwoordlogin verschijnen? Aan als:
 *  - TEST_LOGIN=1 expliciet gezet is (een eigen test-/staging-Vercel-project, dat als "productie" draait), of
 *  - de deploy geen Vercel-productie is (branch-previews + lokaal).
 * Op de ECHTE prod- en demo-deploy staat TEST_LOGIN niet en is VERCEL_ENV "production", dus daar is hij uit.
 * Zo kan Reinier op de test-omgeving inloggen zonder Google/magic-link, zonder dat het in productie lekt.
 */
export function isTestLoginActief(): boolean {
  if (process.env.TEST_LOGIN?.trim() === "1") return true;
  return process.env.VERCEL_ENV !== "production";
}

/**
 * Vaste test-accounts voor de test-wachtwoordlogin (alleen niet-productie). De test-login zoekt ze op
 * e-mailadres op en maakt ze zo nodig aan (met profiel-rol), zodat het op ELKE test-database werkt: de
 * oude gedeelde test-DB én een eigen kluslus-test-DB. De wachtwoorden mogen in de code: wegwerp-accounts
 * op een test-DB zonder echte data, net als DEMO_WACHTWOORD.
 */
export const TEST_LOGIN_ACCOUNTS = {
  kantoor: {
    email: "test-beheerder@kluslus.test",
    wachtwoord: "Testbeheerder1!",
    rol: "beheerder" as const,
    naam: "Test Beheerder",
  },
  monteur: {
    email: "test-monteur@kluslus.test",
    wachtwoord: "Testmonteur1!",
    rol: "monteur" as const,
    naam: "Test Monteur",
  },
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
