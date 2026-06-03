/** Eén in te schieten document, met het uit de PDF gelezen referentienummer. */
export interface InschietItem {
  referentienummer: string | null;
}

/** Een groep documenten die samen één opdracht worden. */
export interface InschietGroep {
  referentienummer: string | null;
  /** Posities in de oorspronkelijke lijst (om de bestanden terug te vinden). */
  indexen: number[];
  /** True als de opdracht aandacht vraagt: geen referentienummer, laat controleren. */
  aandacht: boolean;
}

/**
 * Groepeert in te schieten documenten op referentienummer (design: zelfde ref = één opdracht
 * met meerdere documenten, verschillende refs = aparte opdrachten). Veilig omdat een
 * referentienummer bij één keuken hoort. Documenten zonder ref worden elk een eigen opdracht,
 * gemarkeerd als aandacht ("laat controleren"). Volgorde = eerste voorkomen.
 */
export function groepeerOpRef(items: InschietItem[]): InschietGroep[] {
  const groepen: InschietGroep[] = [];
  const refIndex = new Map<string, InschietGroep>();

  items.forEach((item, i) => {
    const ref = item.referentienummer;
    if (ref === null || ref.trim() === "") {
      groepen.push({ referentienummer: null, indexen: [i], aandacht: true });
      return;
    }
    const bestaand = refIndex.get(ref);
    if (bestaand) {
      bestaand.indexen.push(i);
    } else {
      const groep: InschietGroep = { referentienummer: ref, indexen: [i], aandacht: false };
      refIndex.set(ref, groep);
      groepen.push(groep);
    }
  });

  return groepen;
}
