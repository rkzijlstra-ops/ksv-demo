/**
 * Lokaal concept-vangnet voor het melding-formulier. De melding wordt pas echt opgeslagen als de
 * monteur op "Toevoegen aan rapport" drukt; dit bewaart zijn invoer ondertussen op de telefoon, zodat
 * hij niets kwijtraakt bij een per ongeluk weg-navigeren (ook de telefoon-terugknop) of het sluiten van
 * de app. Foto's en video zijn al geüpload (echte URL's); we bewaren hier alleen de koppeling + tekst.
 */
export type MeldingConcept = {
  tekst: string;
  spoed: boolean;
  fotoUrls: string[];
  videoUrl: string | null;
};

export function meldingConceptSleutel(opdrachtId: string, meldingId?: string): string {
  return `melding-concept:${opdrachtId}:${meldingId ?? "nieuw"}`;
}

/** Een concept zonder enige inhoud hoeft niet bewaard of hersteld te worden. */
export function leegConcept(c: MeldingConcept): boolean {
  return !c.tekst.trim() && c.fotoUrls.length === 0 && !c.videoUrl && !c.spoed;
}

function opslag(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // privacymodus e.d. waar localStorage gooit
  }
}

/** Bewaart het concept (of wist het als het leeg is). Stil bij ontbrekende/geblokkeerde opslag. */
export function bewaarMeldingConcept(opdrachtId: string, meldingId: string | undefined, concept: MeldingConcept): void {
  const s = opslag();
  if (!s) return;
  const sleutel = meldingConceptSleutel(opdrachtId, meldingId);
  try {
    if (leegConcept(concept)) s.removeItem(sleutel);
    else s.setItem(sleutel, JSON.stringify(concept));
  } catch {
    /* opslag vol of geblokkeerd: vangnet faalt stil, het formulier werkt gewoon door */
  }
}

/** Leest een eerder bewaard concept terug, of null als er geen (geldig) concept is. */
export function leesMeldingConcept(opdrachtId: string, meldingId?: string): MeldingConcept | null {
  const s = opslag();
  if (!s) return null;
  try {
    const ruw = s.getItem(meldingConceptSleutel(opdrachtId, meldingId));
    if (!ruw) return null;
    const c = JSON.parse(ruw) as Partial<MeldingConcept>;
    return {
      tekst: typeof c.tekst === "string" ? c.tekst : "",
      spoed: Boolean(c.spoed),
      fotoUrls: Array.isArray(c.fotoUrls) ? c.fotoUrls.filter((u) => typeof u === "string") : [],
      videoUrl: typeof c.videoUrl === "string" ? c.videoUrl : null,
    };
  } catch {
    return null;
  }
}

export function wisMeldingConcept(opdrachtId: string, meldingId?: string): void {
  const s = opslag();
  if (!s) return;
  try {
    s.removeItem(meldingConceptSleutel(opdrachtId, meldingId));
  } catch {
    /* stil */
  }
}
