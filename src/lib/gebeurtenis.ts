import type { Db } from "./db";

/**
 * Logt een actie in het gebeurtenissen-logboek (audit-trail), best-effort: loggen mag de hoofdactie
 * nooit laten falen. De routes geven de uitvoerder mee (uit het profiel dat ze toch al ophalen).
 */
export async function logActie(
  dbi: Db,
  opdrachtId: string,
  actie: string,
  door: { id: string; naam?: string | null; rol?: string | null },
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await dbi.logGebeurtenis({
      opdracht_id: opdrachtId,
      actie,
      door_id: door.id,
      door_naam: door.naam ?? null,
      door_rol: door.rol ?? null,
      details: details ?? null,
    });
  } catch {
    // bewust stil: het logboek mag de gebruikersactie niet blokkeren.
  }
}
