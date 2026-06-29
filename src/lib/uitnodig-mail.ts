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
  const zaak = organisatie.trim();
  // Onderwerp en opening beginnen met de herkenbare zaaknaam: de monteur kent "Kluslus" niet, wel
  // de keukenzaak. Zonder zaak een neutrale terugval.
  const subject = zaak
    ? `${zaak} heeft je toegevoegd aan de planning-app`
    : "Je bent toegevoegd aan de planning-app";
  // Afsluiter = de keukenzaak namens wie gemaild wordt (komt uit de database), zodat hij klopt
  // met de afzender. Geen zaak bekend: neutrale terugval.
  const afzender = zaak || "Het planning-team";
  // Eén uitlegzin over Kluslus, zodat de afzender "<zaak> via Kluslus" niet vaag overkomt.
  const opening = zaak
    ? `${zaak} heeft je toegevoegd aan de planning-app als ${rolLabel(rol)}. Kluslus is de app waarmee ${zaak} de montages plant en je op de hoogte houdt.`
    : `Je bent toegevoegd aan de planning-app als ${rolLabel(rol)}.`;
  const text = `Hoi ${naam},

${opening}

Inloggen:
1. Ga naar ${appUrl}/login
2. Vul dit e-mailadres in en klik op "Stuur magic link" (of gebruik Google).
3. Open de mail en klik op de link. Je bent meteen ingelogd, geen wachtwoord nodig.

De app onthoudt je daarna, dus je hoeft normaal niet opnieuw in te loggen.

${afzender}`;
  return { subject, text };
}
