// KSV Service Worker
// Versie: v1 (basis-skelet, blok G van sessie 2A.9)
// Cache-strategieen volgen in blok H. Voor nu: installeerbaar + clients-claim.

const VERSION = "ksv-v1";

self.addEventListener("install", (event) => {
  // Direct overstap naar de nieuwe SW zonder te wachten op page-reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Pak alle open tabs/clients direct over.
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Blok H breidt dit uit met:
  // - app-shell cache-first
  // - RSC stale-while-revalidate
  // - storage/* cache-first met lange TTL
  // Voor blok G: geen interceptie, alles loopt normaal door het netwerk.
});
