/**
 * Lijst met klok-tijden voor de inplan-selector, van vanUur tot en met totUur in stappen van stapMin
 * minuten (standaard 06:00 t/m 20:00 per 5 min). Wordt als datalist-suggesties aangeboden zodat je kunt
 * kiezen óf typen. Pure functie, los te testen.
 */
export function tijdOpties(vanUur = 6, totUur = 20, stapMin = 5): string[] {
  const opties: string[] = [];
  for (let u = vanUur; u <= totUur; u++) {
    for (let m = 0; m < 60; m += stapMin) {
      if (u === totUur && m > 0) break;
      opties.push(`${String(u).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opties;
}
