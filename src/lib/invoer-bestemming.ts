/**
 * Rol-bewuste bestemming voor een nieuw aangemaakte klus. Eén motor, twee gezichten:
 * - monteur: de klus is meteen van hemzelf (eigen kluspool, ad-hoc, geen aangesloten opdrachtgever);
 * - kantoor (beheerder/opdrachtgever): de klus hoort bij een zaak en moet nog gepland/toegewezen worden.
 * Puur en testbaar; de route mapt het profiel naar deze parameters.
 */

export type Rol = "monteur" | "beheerder" | "opdrachtgever";

export interface Bestemming {
  toegewezen_aan: string | null;
  opdrachtgever_id: string | null;
}

export function bestemmingVoor(
  rol: Rol,
  profiel: { id: string; opdrachtgever_id?: string | null },
  gekozenZaakId?: string | null,
): Bestemming {
  if (rol === "monteur") {
    return { toegewezen_aan: profiel.id, opdrachtgever_id: null };
  }
  // kantoor: naar "te plannen", gekoppeld aan de zaak (expliciet gekozen, anders de eigen zaak)
  return {
    toegewezen_aan: null,
    opdrachtgever_id: gekozenZaakId ?? profiel.opdrachtgever_id ?? null,
  };
}
