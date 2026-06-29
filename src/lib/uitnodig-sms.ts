import { verstuurSms } from "./sms";
import { smsAfzender } from "./notificaties";

/**
 * Korte SMS die als vangnet bij de uitnodigingsmail meegaat: voor het geval die in de spam belandt of
 * onopgemerkt blijft. Bewust geen inloglink in de SMS (gevoelig); de monteur vraagt zelf een verse
 * magic link aan op /login, en die komt betrouwbaar in de inbox. Pure functie, los te testen.
 */
export function uitnodigingSmsTekst(naam: string, organisatie: string, appUrl: string): string {
  const zaak = organisatie.trim() || "Het planning-team";
  const url = appUrl.trim().replace(/\/$/, "");
  return (
    `Hoi ${naam}, ${zaak} heeft je toegevoegd aan de planning-app (Kluslus). ` +
    `Inloggen: ${url}/login, vul je mailadres in voor een inloglink. ` +
    `Ook gemaild, check eventueel je spam.`
  );
}

export interface UitnodigingSmsInput {
  /** Bestemming in internationaal formaat (+31...); de route normaliseert vooraf. */
  naar: string;
  naam: string;
  appUrl: string;
  /** Naam van de keukenzaak; bepaalt de afzender en staat in de tekst. */
  organisatie?: string;
}

/**
 * Verstuurt de uitnodig-SMS via CM.com (achter verstuurSms, met dezelfde dry-run/allowlist-grendel).
 * Best-effort: de route vangt een fout op zodat de uitnodiging als geheel niet klapt op de SMS.
 */
export async function verstuurUitnodigingSms(input: UitnodigingSmsInput): Promise<void> {
  const tekst = uitnodigingSmsTekst(input.naam, input.organisatie ?? "", input.appUrl);
  await verstuurSms({ naar: input.naar, tekst, afzender: smsAfzender(input.organisatie ?? null) });
}
