import { isActief } from "./opdracht-status";
import type { DashboardStatus } from "./db";

/** Afgeronde opdrachten (opgeleverd/geannuleerd) blijven dit aantal dagen in beeld, daarna archief. */
export const ARCHIEF_DAGEN = 14;

/** Minimale velden die de scoping nodig heeft (een Melding voldoet hieraan). */
export interface ScopebareOpdracht {
  dashboard_status: DashboardStatus;
  opgeleverd_at: string | null;
  created_at: string;
}

/**
 * Dashboard-lijst-scoping (design): actief werk is altijd zichtbaar; opgeleverd en geannuleerd
 * tonen standaard alleen de laatste ARCHIEF_DAGEN dagen, ouder verdwijnt uit het zicht (niet weg,
 * blijft vindbaar via referentienummer/klantdossier). Pure functie met injecteerbare peildatum,
 * zodat het venster testbaar is zonder echte klok. Verplaatsbaar naar een DB-filter bij grote schaal
 * zonder dat de aanroeper verandert.
 */
export function scopeVoorDashboard<T extends ScopebareOpdracht>(opdrachten: T[], peildatum: Date): T[] {
  const grens = peildatum.getTime() - ARCHIEF_DAGEN * 24 * 60 * 60 * 1000;
  return opdrachten.filter((o) => {
    if (isActief(o.dashboard_status)) return true;
    // Afgerond: opgeleverd telt op opgeleverd_at, geannuleerd valt terug op created_at.
    const peil = o.opgeleverd_at ?? o.created_at;
    return new Date(peil).getTime() >= grens;
  });
}
