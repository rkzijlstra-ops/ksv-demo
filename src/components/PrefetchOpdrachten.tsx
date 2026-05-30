"use client";

import { useEffect } from "react";

/**
 * Pre-cachet opdracht-detail-pagina's op de achtergrond zodra de werkbak laadt.
 * De Service Worker pakt deze fetches op en zet ze in cache, zodat de monteur
 * later in de kelder zonder netwerk gewoon kan doorklikken.
 *
 * Werkt alleen in productie (SW staat in dev uit). Stilstand bij fout - prefetch
 * is best-effort, niet kritiek.
 */
export function PrefetchOpdrachten({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const id of ids) {
        if (cancelled) break;
        try {
          await fetch(`/opdracht/${id}`, {
            method: "GET",
            credentials: "same-origin",
          });
        } catch {
          // Best-effort; bij fout gewoon door naar volgende.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);
  return null;
}
