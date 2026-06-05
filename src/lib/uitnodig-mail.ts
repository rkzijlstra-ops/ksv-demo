import type { Rol } from "./db";

function rolLabel(rol: Rol): string {
  if (rol === "monteur") return "monteur";
  if (rol === "opdrachtgever") return "opdrachtgever";
  return "beheerder";
}

/**
 * Onderwerp en tekst van de uitnodigingsmail. Pure functie, los te testen.
 * Verwijst naar /login; inloggen gaat met een magic link of Google, zonder wachtwoord.
 */
export function uitnodigingTekst(
  naam: string,
  rol: Rol,
  appUrl: string,
  organisatie = "",
): { subject: string; text: string } {
  const subject = "Je bent toegevoegd aan de planning-app";
  // Afsluiter = de keukenzaak namens wie gemaild wordt (komt uit de database), zodat hij klopt
  // met de afzender. Geen zaak bekend: neutrale terugval.
  const afzender = organisatie.trim() || "Het planning-team";
  const text = `Hoi ${naam},

Je bent toegevoegd aan de planning-app als ${rolLabel(rol)}.

Inloggen:
1. Ga naar ${appUrl}/login
2. Vul dit e-mailadres in en klik op "Stuur magic link" (of gebruik Google).
3. Open de mail en klik op de link. Je bent meteen ingelogd, geen wachtwoord nodig.

De app onthoudt je daarna, dus je hoeft normaal niet opnieuw in te loggen.

${afzender}`;
  return { subject, text };
}
