const MAANDEN_KORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/**
 * Korte, mobiel-leesbare NL-datum: "30 mei".
 * Accepteert zowel een date ("2026-05-30") als een timestamp ("2026-05-28T10:00:00Z").
 * Neemt bewust het date-deel los van timezone om dag-verschuiving te voorkomen.
 * null/ongeldig -> "—".
 */
export function formatDatumKort(input: string | null | undefined): string {
  if (!input) return "—";
  const datePart = input.split("T")[0];
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  const maand = MAANDEN_KORT[parseInt(m[2], 10) - 1];
  if (!maand) return "—";
  return `${parseInt(m[3], 10)} ${maand}`;
}
