/** Het domein (deel na de @) van een e-mailadres, genormaliseerd (lowercase, getrimd). Null als er geen @ in zit. */
export function domeinVanAdres(adres: string | null | undefined): string | null {
  const v = (adres ?? "").trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 0 || at === v.length - 1) return null;
  return v.slice(at + 1);
}

/**
 * Is dit de eerste verzending ooit naar het domein van `naar`? Vergelijkt op domein, niet op het
 * volledige adres: een nieuwe keukenzaak (nieuw domein) is de risicovolle eerste keer (kans op spam).
 * `eerdereAdressen` zijn de adressen van eerdere verzendingen (mag de huidige verzending bevatten of niet).
 */
export function isEersteVerzendingNaarDomein(
  naar: string | null | undefined,
  eerdereAdressen: Array<string | null | undefined>,
): boolean {
  const doel = domeinVanAdres(naar);
  if (!doel) return false;
  return !eerdereAdressen.some((a) => domeinVanAdres(a) === doel);
}

/**
 * Is deze klus het eerste contact ooit met dat domein? `verzendingenNaarDomein` zijn ALLE verzendingen
 * (over alle klussen) naar het betreffende domein. Eerste contact = elke verzending naar dat domein
 * hoort bij deze klus (geen andere klus heeft die zaak ooit gemaild). Een herverzending binnen dezelfde
 * klus telt dus niet als "tweede contact".
 */
export function isEersteContactMetDomein(
  opdrachtId: string,
  verzendingenNaarDomein: Array<{ opdracht_id: string }>,
): boolean {
  return (
    verzendingenNaarDomein.length > 0 &&
    verzendingenNaarDomein.every((v) => v.opdracht_id === opdrachtId)
  );
}
