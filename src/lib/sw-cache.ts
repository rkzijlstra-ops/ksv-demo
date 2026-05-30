/**
 * Vraagt de service worker om de HTML-versie van alle gecachte navigate-URLs te
 * verversen. Aanroepen na elke succesvolle mutatie (POST/PATCH/DELETE) zodat
 * een latere offline-navigatie de actuele inhoud ziet.
 *
 * Reden: router.refresh() doet alleen een RSC-fetch, die niet onder dezelfde
 * cache-key valt als een navigate naar dezelfde URL. Zonder deze ping zou de
 * werkpool/opdracht-detail offline de oude (pre-mutatie) versie blijven tonen.
 *
 * Best-effort: stille faal als er geen SW is (dev of geen browser-support).
 */
export function vernieuwOfflineCache(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const reg = navigator.serviceWorker.controller;
  if (!reg) return;
  reg.postMessage({ type: "REFRESH_NAV_CACHE" });
}
