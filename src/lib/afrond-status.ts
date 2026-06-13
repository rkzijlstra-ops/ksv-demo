import type { Melding } from "./db";

/** De afgeleide "voltooid"-toestand voor de badge. Null = geen voltooid-overlay. */
export type AfrondStatus = "voltooid" | "vervolg-plannen" | "voltooid-akkoord";

type AfrondVelden = Pick<Melding, "afgerond_door_monteur_at" | "afgerond_vervolg_nodig" | "afgerond_akkoord_at">;

export function afrondStatus(m: AfrondVelden): AfrondStatus | null {
  if (m.afgerond_akkoord_at) return "voltooid-akkoord";
  // Vervolg nodig: ongeacht of de klus al naar "te plannen" ging (kantoor) of bij de monteur bleef
  // (ad-hoc, geen kantoor). In beide gevallen moet er nog iets gepland worden.
  if (m.afgerond_door_monteur_at && m.afgerond_vervolg_nodig) return "vervolg-plannen";
  if (m.afgerond_door_monteur_at) return "voltooid";
  return null;
}

export function afrondStatusLabel(s: AfrondStatus): string {
  switch (s) {
    case "voltooid":
      return "Voltooid";
    case "vervolg-plannen":
      return "Vervolg plannen";
    case "voltooid-akkoord":
      return "Voltooid";
  }
}
