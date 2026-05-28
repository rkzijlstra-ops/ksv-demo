export type Platform = "android" | "ios" | "other";

export function detectPlatform(userAgent: string): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}

/**
 * Bouwt een navigatie-URL voor het opgegeven adres.
 * - Android: geo: URI opent de standaard kaart-app
 * - iOS / overig: Google Maps via https (opent app indien geïnstalleerd, anders browser)
 */
export function navUrl(adres: string, platform: Platform): string {
  const q = encodeURIComponent(adres);
  if (platform === "android") return `geo:0,0?q=${q}`;
  return `https://maps.google.com/?q=${q}`;
}
