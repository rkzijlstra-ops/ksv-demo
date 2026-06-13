import { randomBytes } from "node:crypto";

/**
 * Inbound (mail-naar-app): elke monteur heeft een eigen ontvangstadres `klus-<token>@<inbound-domein>`.
 * Stuurt hij een mail van zijn opdrachtgever daarheen, dan herkent de app hem aan dat token. Puur en
 * testbaar; geen DB of netwerk hier.
 */

/** Het domein waarop de app mail ontvangt (Resend Receiving). Env-bepaald, met een veilige terugval. */
export function inboundDomein(): string {
  return process.env.INBOUND_DOMAIN?.trim() || "kluslus.nl";
}

/** Nieuw ontvangsttoken: 16 hex-tekens (kleine letters, dus geen hoofdletter-gedoe in mailadressen). */
export function genereerInboundToken(): string {
  return randomBytes(8).toString("hex");
}

/** Het volledige ontvangstadres voor een token. */
export function inboundAdres(token: string, domein = inboundDomein()): string {
  return `klus-${token}@${domein}`;
}

/** Haalt het e-mailadres uit "Naam <adres>" of geeft het adres zelf terug, genormaliseerd (lowercase). */
function emailDeel(ruw: string): string {
  const m = ruw.match(/<([^>]+)>/);
  return (m ? m[1] : ruw).trim().toLowerCase();
}

/**
 * Haalt het token uit de ontvanger-adressen van een binnengekomen mail. Zoekt een adres "klus-<token>"
 * op het inbound-domein en geeft het token terug, of null als er geen match is.
 */
export function tokenUitAdressen(adressen: string[], domein = inboundDomein()): string | null {
  const suffix = `@${domein.trim().toLowerCase()}`;
  for (const ruw of adressen) {
    const adres = emailDeel(ruw);
    if (!adres.endsWith(suffix)) continue;
    const lokaal = adres.slice(0, -suffix.length);
    if (lokaal.startsWith("klus-")) {
      const token = lokaal.slice("klus-".length);
      if (token) return token;
    }
  }
  return null;
}
