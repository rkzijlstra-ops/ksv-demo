/** Eenvoudige e-mail-formaatcheck: precies één @, iets ervoor, en een domein met punt erna. */
export function geldigEmail(waarde: string | null | undefined): boolean {
  const v = (waarde ?? "").trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
