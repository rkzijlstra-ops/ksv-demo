"use client";

import { useEffect } from "react";

/**
 * Pre-cachet opdracht-detail-pagina's op de achtergrond zodra de werkbak laadt,
 * zodat de monteur later in de kelder kan doorklikken zonder netwerk.
 *
 * Belangrijk om dit licht te houden zodat het niet concurreert met POSTs van de
 * gebruiker:
 *   - skip URLs die al in de SW-cache zitten
 *   - 1.5 s pauze tussen fetches
 *   - priority "low" zodat de browser ze achteraan zet
 *   - alleen in productie (SW staat in dev uit)
 *
 * Best-effort: fouten worden stil ingeslikt.
 */
export function PrefetchOpdrachten({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (ids.length === 0) return;

    let cancelled = false;

    async function alGecached(url: string): Promise<boolean> {
      try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (!name.endsWith("-pages")) continue;
          const cache = await caches.open(name);
          const match = await cache.match(url);
          if (match) return true;
        }
        return false;
      } catch {
        return false;
      }
    }

    (async () => {
      for (const id of ids) {
        if (cancelled) break;
        const url = `/opdracht/${id}`;
        if (await alGecached(url)) continue;
        try {
          await fetch(url, {
            method: "GET",
            credentials: "same-origin",
            // `priority` is een hint; browsers die het niet kennen negeren het.
            priority: "low",
          } as RequestInit);
        } catch {
          // best-effort
        }
        // Pauze tussen requests om de server en de gebruikers-POSTs lucht te geven.
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);
  return null;
}
