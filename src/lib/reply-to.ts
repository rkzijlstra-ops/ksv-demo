import { geldigEmail } from "./email";

/**
 * Bepaalt het Reply-To-adres voor een oplever-mail. De afzender blijft het centrale
 * RESEND_FROM-adres (goede aflevering), maar een antwoord van de keukenzaak hoort bij de
 * monteur die opleverde. Heeft de monteur een geldig contact-mailadres, dan dat; anders het
 * vangnet (RESEND_REPLY_TO, bv. antwoord@kluslus.nl). Zo loopt een mail nooit vast door een
 * leeg veld en komt een antwoord nooit bij niemand uit.
 */
export function bepaalReplyTo(
  monteurEmail: string | null | undefined,
  fallback: string | undefined,
): string | undefined {
  if (geldigEmail(monteurEmail)) return (monteurEmail as string).trim();
  return fallback;
}
