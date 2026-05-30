"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncQueue } from "@/lib/sync";
import { aantalInQueue, resetMislukteItems } from "@/lib/queue";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

/**
 * Start de sync-pijp:
 * - bij mount: doe een initial run (er kan nog iets in de queue staan van eerder)
 * - bij elk `window.online`-event: opnieuw runnen
 *
 * Bij succes wordt `router.refresh()` aangeroepen zodat opdracht-detail en
 * werkbak de nieuw gelande meldingen vanzelf tonen.
 */
export function SyncBoot() {
  const router = useRouter();
  const lopendRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function probeerSync() {
      if (lopendRef.current) return;
      if (!navigator.onLine) return;
      const aantal = await aantalInQueue().catch(() => 0);
      if (aantal === 0) return;
      lopendRef.current = true;
      try {
        const res = await syncQueue();
        if (res.geslaagd > 0) {
          router.refresh();
          vernieuwOfflineCache();
        }
      } finally {
        lopendRef.current = false;
      }
    }

    async function bijOnline() {
      // Net netwerk terug: alle eerder mislukte items een verse kans geven.
      await resetMislukteItems().catch(() => {});
      void probeerSync();
    }

    // Initial run na korte vertraging zodat de page-render eerst af is.
    const initial = setTimeout(probeerSync, 500);
    window.addEventListener("online", bijOnline);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("online", bijOnline);
    };
  }, [router]);

  return null;
}
