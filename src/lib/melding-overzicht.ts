/**
 * Korte telling van de media bij een melding, voor het read-only meldingen-overzicht
 * ("Dit gaat mee in het rapport"). Bijv. "2 foto's · video", "1 foto", "video", of "" als er niets is.
 */
export function meldingMediaTelling(fotoCount: number, heeftVideo: boolean): string {
  const delen: string[] = [];
  if (fotoCount === 1) delen.push("1 foto");
  else if (fotoCount > 1) delen.push(`${fotoCount} foto's`);
  if (heeftVideo) delen.push("video");
  return delen.join(" · ");
}
