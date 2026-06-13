import type { Melding } from "./db";

/** De afgeleide "voltooid"-toestand voor de badge. Null = geen voltooid-overlay. */
export type AfrondStatus = "voltooid" | "vervolg-plannen" | "voltooid-akkoord";

type AfrondVelden = Pick<
  Melding,
  "afgerond_door_monteur_at" | "afgerond_vervolg_nodig" | "afgerond_akkoord_at" | "dashboard_status"
>;

export function afrondStatus(m: AfrondVelden): AfrondStatus | null {
  if (m.afgerond_akkoord_at) return "voltooid-akkoord";
  if (m.afgerond_door_monteur_at && m.afgerond_vervolg_nodig && m.dashboard_status === "binnen") {
    return "vervolg-plannen";
  }
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
