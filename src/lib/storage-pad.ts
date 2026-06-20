/**
 * Haalt het opslag-pad uit een Supabase-public-url voor een gegeven bucket. Pure functie (geen IO),
 * zodat ze los te testen is. Gebruikt om een te verwijderen oplever-foto/video terug te vertalen naar
 * het pad waarmee `storage.remove()` werkt.
 *
 * Voorbeeld: ".../object/public/meldingen-fotos/abc.jpg" + "meldingen-fotos" -> "abc.jpg".
 * Geeft null als de bucket niet in de url voorkomt of er niets achter staat.
 */
export function padUitPublicUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const rest = url.slice(i + marker.length).split("?")[0];
  return rest ? decodeURIComponent(rest) : null;
}
