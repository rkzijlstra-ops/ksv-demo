"use client";

import { useState } from "react";
import { DownloadCloud, Check, Loader2 } from "lucide-react";

/**
 * Laadt alle documenten van de klus alvast in de offline-cache, voor op locatie zonder bereik. De
 * service worker cachet storage-URL's cache-first, dus een gewone fetch per document vult de cache.
 */
export function OfflineLaadKnop({ urls }: { urls: string[] }) {
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);

  async function laad() {
    setBezig(true);
    setKlaar(false);
    try {
      await Promise.allSettled(urls.map((u) => fetch(u, { cache: "reload" })));
      setKlaar(true);
    } finally {
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={laad}
      disabled={bezig || urls.length === 0}
      className="inline-flex items-center justify-center gap-2 border border-dashed border-line bg-white px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
    >
      {bezig ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : klaar ? (
        <Check size={16} strokeWidth={2.5} className="text-success" aria-hidden="true" />
      ) : (
        <DownloadCloud size={16} aria-hidden="true" />
      )}
      {klaar ? "Offline beschikbaar" : "Laad alles offline"}
    </button>
  );
}
