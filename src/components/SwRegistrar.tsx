"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Registreert de service worker bij eerste page-load (alleen in productie; in dev staat de SW uit).
 * Detecteert daarnaast een nieuwe versie en toont dan een klein "verversen"-balkje, zodat de monteur
 * (en wij bij het keuren) niet meer met een vastgehouden oude versie blijven zitten. De SW zelf doet al
 * skipWaiting + clients.claim, dus na verversen draait meteen de nieuwste code.
 */
export function SwRegistrar() {
  const [updateKlaar, setUpdateKlaar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Nieuwe SW gevonden: zodra hij geïnstalleerd is én er al een actieve versie draaide, is het
        // een update (niet de allereerste installatie). Dan het verversen-balkje tonen.
        reg.addEventListener("updatefound", () => {
          const nieuw = reg.installing;
          if (!nieuw) return;
          nieuw.addEventListener("statechange", () => {
            if (nieuw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateKlaar(true);
            }
          });
        });
        // Tijdens een lange sessie / keuring af en toe op updates checken.
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60_000);
        return () => clearInterval(interval);
      })
      .catch(() => {
        // Stille faal: zonder SW werkt de app gewoon (geen offline-support).
      });
  }, []);

  if (!updateKlaar) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-3 border-t-2 border-ink bg-accent px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-white">
      <span className="text-sm font-extrabold">Nieuwe versie beschikbaar</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 border-2 border-white bg-white px-3 py-1.5 text-sm font-extrabold uppercase tracking-[0.04em] text-accent hover:opacity-90 focus-visible:outline-3 focus-visible:outline-white"
      >
        <RefreshCw size={16} strokeWidth={2.5} aria-hidden="true" />
        Verversen
      </button>
    </div>
  );
}
