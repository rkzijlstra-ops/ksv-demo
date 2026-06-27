// KSV Service Worker
// Versie: v3 - PDF-viewer/documenten-blok; cache-bump dwingt verse code af + ruimt oude caches op
// Drie cache-strategieen:
//   1. app-shell + Next static chunks (cache-first, langere TTL)
//   2. HTML/RSC-navigatie (stale-while-revalidate, snel + actueel)
//   3. Supabase Storage assets + next/image (cache-first, lange TTL)

const VERSION = "ksv-v14";
const CACHE_SHELL = `${VERSION}-shell`;
const CACHE_PAGES = `${VERSION}-pages`;
const CACHE_STORAGE = `${VERSION}-storage`;

// Statische assets die we direct bij install pakken.
const APP_SHELL = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Niet kritiek als precache faalt; runtime fetch vult cache alsnog.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Verwijder caches van oudere versies.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", async (event) => {
  if (event.data && event.data.type === "REFRESH_NAV_CACHE") {
    // Client meldt dat een mutatie voltooid is. Ververs de HTML-cache van alle
    // gecachte navigate-URLs (negeer RSC-fetches herkenbaar aan `_rsc`-query).
    try {
      const cache = await caches.open(CACHE_PAGES);
      const requests = await cache.keys();
      await Promise.all(
        requests.map(async (req) => {
          const url = new URL(req.url);
          if (url.searchParams.has("_rsc")) return;
          try {
            const fresh = await fetch(req.url);
            if (fresh.ok) await cache.put(req, fresh.clone());
          } catch {
            // best-effort
          }
        }),
      );
    } catch {
      // best-effort
    }
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Alleen GET cachen; POST/PATCH/DELETE laten we altijd door naar netwerk.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. Supabase Storage (foto's, PDFs, rapporten): cache-first met lange TTL.
  if (url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/")) {
    event.respondWith(cacheFirst(request, CACHE_STORAGE));
    return;
  }

  // 2. Same-origin assets + pages.
  if (url.origin === self.location.origin) {
    // 2a. API-routes, auth-callback en login: nooit uit cache (state-changing of
    //     vereisen verse server-respons).
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/auth/") ||
      url.pathname === "/login"
    ) {
      return;
    }

    // 2b. Next.js static chunks (gehashte filenames, langlevend): cache-first.
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, CACHE_SHELL));
      return;
    }

    // 2c. next/image optimizer: cache-first met aparte storage-cache.
    if (url.pathname.startsWith("/_next/image")) {
      event.respondWith(cacheFirst(request, CACHE_STORAGE));
      return;
    }

    // 2d. App-pages (werkbak + opdracht-detail): network-first.
    //     Online = altijd verse RSC (mutaties zichtbaar zonder refresh).
    //     Offline = fallback naar gecachte versie.
    //     Path-based ipv mode-based, zodat ook prefetch-fetches geraakt worden.
    const isAppPage =
      url.pathname === "/" ||
      url.pathname.startsWith("/opdracht/");
    if (isAppPage) {
      event.respondWith(networkFirst(request, CACHE_PAGES));
      return;
    }
  }

  // Default: laat de fetch normaal door (eigen api, third-party).
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    return new Response("Offline en niet in cache", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Offline en niet in cache", { status: 503 });
  }
}
