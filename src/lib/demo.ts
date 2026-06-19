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

/** Komma-lijst uit een env-var naar een schone lijst trimmen (lege waarden eruit). */
export function leesAllowlist(waarde: string | undefined): string[] {
  return (waarde ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Mag een (bedoeld) bericht naar deze ontvanger echt de deur uit? Eén regel voor zowel SMS als mail.
 * - demo + lege allowlist  -> nee (fail-safe: nooit ongelimiteerd vanuit een demo).
 * - allowlist gevuld        -> alleen als de ontvanger erop staat.
 * - geen demo + lege allowlist -> ja (normale productie).
 */
export function ontvangerToegestaan(
  naar: string,
  allowlist: string[],
  demo: boolean,
): { toegestaan: boolean; reden?: string } {
  if (demo && allowlist.length === 0) {
    return { toegestaan: false, reden: "demo zonder allowlist (fail-safe): niets verstuurd" };
  }
  if (allowlist.length > 0 && !allowlist.includes(naar)) {
    return { toegestaan: false, reden: "staat niet op de allowlist" };
  }
  return { toegestaan: true };
}
