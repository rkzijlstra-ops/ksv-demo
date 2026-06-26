import { geldigEmail } from "./email";
import { normaliseerNlMobiel } from "./telefoon";

/** De afzendergegevens die een monteur bij eerste gebruik moet invullen (komen op het opleverrapport). */
export interface AfzenderVelden {
  naam: string | null;
  bedrijfsnaam: string | null;
  telefoon: string | null;
  contact_email: string | null;
}

/**
 * Is het profiel volledig genoeg om mee te werken? Vier verplichte afzendergegevens: naam, bedrijfsnaam,
 * een geldig mobiel nummer (ook voor SMS) en een geldig contact-mailadres (ook het Reply-To). De
 * onboarding-gate gebruikt dit; pas de eis hier aan en de gate volgt vanzelf.
 */
export function profielVolledig(p: AfzenderVelden): boolean {
  return (
    !!p.naam?.trim() &&
    !!p.bedrijfsnaam?.trim() &&
    normaliseerNlMobiel(p.telefoon) !== null &&
    geldigEmail(p.contact_email)
  );
}
