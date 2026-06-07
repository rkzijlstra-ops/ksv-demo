/**
 * Normaliseert een Nederlands mobiel nummer naar internationaal formaat (+316XXXXXXXX).
 * Geeft null terug als het geen geldig NL-mobiel is (vast nummer, te kort, onzin). Bewust streng:
 * een SMS naar een fout nummer kost geld en komt nooit aan.
 */
export function normaliseerNlMobiel(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s-]/g, "");
  if (s.startsWith("+31")) s = "0" + s.slice(3);
  else if (s.startsWith("0031")) s = "0" + s.slice(4);
  // NL-mobiel: 06 gevolgd door 8 cijfers.
  if (!/^06\d{8}$/.test(s)) return null;
  return "+31" + s.slice(1);
}
