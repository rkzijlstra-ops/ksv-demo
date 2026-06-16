/** Eén geparste PDF-kop uit een binnengekomen mail. */
export interface InboundKopItem {
  referentienummer: string | null;
  klant_naam: string | null;
  klant_adres: string | null;
}

/** Een groep PDF's die samen één klus worden. */
export interface InboundGroep {
  referentienummer: string | null;
  /** Posities in de oorspronkelijke lijst (om de bestanden terug te vinden). */
  indexen: number[];
  /** Positie van de meest complete kop; die wordt de kop van de klus. */
  kopIndex: number;
}

/** Lege/whitespace-ref telt als geen ref. */
function normRef(ref: string | null): string | null {
  return ref && ref.trim() !== "" ? ref.trim() : null;
}

/** Hoe "compleet" een kop is: een ref weegt het zwaarst, dan klantnaam, dan adres. */
function score(k: InboundKopItem): number {
  return (normRef(k.referentienummer) ? 4 : 0) + (k.klant_naam ? 2 : 0) + (k.klant_adres ? 1 : 0);
}

/** Index van de meest complete kop binnen een groep (gelijkspel: laagste index). */
function besteKop(koppen: InboundKopItem[], indexen: number[]): number {
  let beste = indexen[0];
  for (const i of indexen) {
    if (score(koppen[i]) > score(koppen[beste])) beste = i;
  }
  return beste;
}

/**
 * Groepeert de PDF's van ÉÉN binnengekomen mail tot klussen. Anders dan het dashboard-slepen
 * (groepeerOpRef) hoort alles in één mail bij dezelfde keuken: een doorgestuurde order bevat vaak
 * een order-PDF én een leidingadvies-schema, en soms parseert er één leeg. Daarom:
 * - is er hooguit één referentienummer (of geen), dan wordt alles ÉÉN klus (geen lege splitsing);
 * - zijn er meerdere verschillende refs, dan per ref een klus (echt meerdere orders in één mail),
 *   en PDF's zonder ref hangen bij de eerste keuken zodat er nooit een kale, lege klus ontstaat.
 * De meest complete kop wordt telkens de kop van de klus.
 */
export function groepeerInboundOrder(koppen: InboundKopItem[]): InboundGroep[] {
  if (koppen.length === 0) return [];

  const distinct: string[] = [];
  for (const k of koppen) {
    const ref = normRef(k.referentienummer);
    if (ref && !distinct.includes(ref)) distinct.push(ref);
  }

  // Hooguit één ref (of geen): één keuken, alle PDF's erbij.
  if (distinct.length <= 1) {
    const indexen = koppen.map((_, i) => i);
    return [
      {
        referentienummer: distinct[0] ?? null,
        indexen,
        kopIndex: besteKop(koppen, indexen),
      },
    ];
  }

  // Meerdere refs: per ref een groep; loze PDF's bij de eerste groep.
  const groepen: InboundGroep[] = distinct.map((ref) => ({ referentienummer: ref, indexen: [], kopIndex: -1 }));
  koppen.forEach((k, i) => {
    const ref = normRef(k.referentienummer);
    const groep = ref ? groepen[distinct.indexOf(ref)] : groepen[0];
    groep.indexen.push(i);
  });
  for (const groep of groepen) groep.kopIndex = besteKop(koppen, groep.indexen);
  return groepen;
}
