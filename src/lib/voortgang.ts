/** Begrenst een percentage netjes tussen 0 en 100 (afgerond). Pure functie. */
export function clampPercent(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Percentage uit geladen/totaal bytes; 0 als totaal onbekend. Pure functie. */
export function uploadPercent(geladen: number, totaal: number): number {
  if (!totaal || totaal <= 0) return 0;
  return clampPercent((geladen / totaal) * 100);
}
