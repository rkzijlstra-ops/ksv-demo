/**
 * Weergave-helpers voor documenten: leidt de SOORT af uit de bestandsnaam (geen DB-kolom nodig, de
 * bestandsnamen van de keukenzaken zijn consistent) en koppelt er een label, kleur en icoon aan.
 * Puur, los te testen. De kleuren komen uit de kleurenkaart (globals.css); de iconen uit de icoon-kaart
 * (docs/ICONEN.md) en worden in de React-componenten op de lucide-iconen gemapt via `iconKey`.
 */

export type DocumentSoort =
  | "orderbon"
  | "bovenaanzicht"
  | "leidingschema"
  | "tekening"
  | "offerte"
  | "werkbon"
  | "afbeelding"
  | "overig";

/** Leidt de soort af uit bestandsnaam (+ optioneel het ruwe type "pdf"/"afbeelding"). */
export function documentSoort(bestandsnaam: string | null | undefined, type?: string): DocumentSoort {
  if (type === "afbeelding") return "afbeelding";
  const n = (bestandsnaam ?? "").toLowerCase();
  if (/\.(jpe?g|png|webp|gif|heic)$/.test(n)) return "afbeelding";
  if (n.includes("bovenaanzicht")) return "bovenaanzicht";
  if (n.includes("leidingschema") || n.includes("leiding")) return "leidingschema";
  if (n.includes("orderbon") || n.includes("orderbevestiging")) return "orderbon";
  if (n.includes("offerte")) return "offerte";
  if (n.includes("werkbon") || n.includes("klmont")) return "werkbon";
  if (n.includes("aanzicht") || n.includes("schema") || n.includes("tekening") || n.includes("plattegrond"))
    return "tekening";
  return "overig";
}

export interface SoortMeta {
  /** Korte zichtbare naam op de badge. */
  label: string;
  /** Of dit een tekening/schema is (visueel materiaal dat de monteur steeds opent). */
  tekening: boolean;
  /** Sleutel die de component op een lucide-icoon mapt (zie docs/ICONEN.md). */
  iconKey: "orderbon" | "tekening" | "bovenaanzicht" | "leidingschema" | "offerte" | "werkbon" | "afbeelding" | "overig";
}

const META: Record<DocumentSoort, SoortMeta> = {
  orderbon: { label: "Orderbon", tekening: false, iconKey: "orderbon" },
  bovenaanzicht: { label: "Bovenaanzicht", tekening: true, iconKey: "bovenaanzicht" },
  leidingschema: { label: "Leidingschema", tekening: true, iconKey: "leidingschema" },
  tekening: { label: "Tekening", tekening: true, iconKey: "tekening" },
  offerte: { label: "Offerte", tekening: false, iconKey: "offerte" },
  werkbon: { label: "Werkbon", tekening: false, iconKey: "werkbon" },
  afbeelding: { label: "Foto", tekening: false, iconKey: "afbeelding" },
  overig: { label: "Order", tekening: false, iconKey: "overig" },
};

export function documentMeta(soort: DocumentSoort): SoortMeta {
  return META[soort];
}

/** Drie groepen voor de weergave, in vaste volgorde. */
export type DocumentGroep = "orderbon" | "tekeningen" | "overig";

export function documentGroep(soort: DocumentSoort): DocumentGroep {
  if (soort === "orderbon") return "orderbon";
  if (soort === "bovenaanzicht" || soort === "leidingschema" || soort === "tekening") return "tekeningen";
  return "overig";
}

export const GROEP_LABEL: Record<DocumentGroep, string> = {
  orderbon: "Orderbon",
  tekeningen: "Tekeningen",
  overig: "Overig",
};
