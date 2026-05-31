/**
 * Normaliseert een (Nederlands) telefoonnummer naar internationaal formaat zonder plus,
 * geschikt voor een wa.me-link. Pakt het eerste nummer als er meerdere in de string staan.
 * Geeft null als er geen bruikbaar nummer in zit. Pure functie.
 */
export function normaliseerNummerNL(telefoon: string | null | undefined): string | null {
  if (!telefoon) return null;
  const eerste = telefoon.split(/[/;,]| {2,}/)[0] ?? telefoon;
  let s = eerste.replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  else if (s.startsWith("0")) s = "31" + s.slice(1);
  if (!/^\d{9,15}$/.test(s)) return null;
  return s;
}

/**
 * Bouwt een wa.me-URL voor een telefoonnummer, optioneel met een vooringevuld bericht.
 * Geeft null als het nummer onbruikbaar is. Pure functie.
 */
export function whatsappUrl(telefoon: string | null | undefined, tekst?: string): string | null {
  const nr = normaliseerNummerNL(telefoon);
  if (!nr) return null;
  const basis = `https://wa.me/${nr}`;
  return tekst ? `${basis}?text=${encodeURIComponent(tekst)}` : basis;
}
