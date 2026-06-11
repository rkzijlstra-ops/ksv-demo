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

const MAANDEN_LANG = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/**
 * Korte, mobiel-leesbare NL-datum: "30 mei".
 * Accepteert zowel een date ("2026-05-30") als een timestamp ("2026-05-28T10:00:00Z").
 * Neemt bewust het date-deel los van timezone om dag-verschuiving te voorkomen.
 * null/ongeldig -> "—".
 */
export function formatDatumKort(input: string | null | undefined): string {
  return formatMet(input, MAANDEN_KORT, false);
}

/**
 * Volledige NL-datum met jaartal: "10 juni 2026". Voor formele documenten (zoals het
 * opleverrapport) waar een opleverdatum compleet moet ogen. Zelfde timezone-veilige parsing als
 * formatDatumKort. null/ongeldig -> "—".
 */
export function formatDatumLang(input: string | null | undefined): string {
  return formatMet(input, MAANDEN_LANG, true);
}

function formatMet(input: string | null | undefined, maanden: string[], metJaar: boolean): string {
  if (!input) return "—";
  const datePart = input.split("T")[0];
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "—";
  const maand = maanden[parseInt(m[2], 10) - 1];
  if (!maand) return "—";
  const basis = `${parseInt(m[3], 10)} ${maand}`;
  return metJaar ? `${basis} ${m[1]}` : basis;
}
