"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker bij eerste page-load. Alleen in productie, omdat
 * serwist in dev uit staat (Turbopack + SW geeft hot-reload-issues).
 * Verdere details (offline-caching, runtime-strategies) staan in `src/app/sw.ts`.
 */
export function SwRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Stille faal: SW niet beschikbaar is geen blocker, app werkt zonder offline-support.
    });
  }, []);
  return null;
}
