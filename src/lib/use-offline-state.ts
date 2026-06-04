"use client";

import { useEffect, useState } from "react";
import { aantalInQueue } from "./queue";
import { abonneerOpQueue, abonneerOpSync } from "./sync-state";

export interface OfflineState {
  online: boolean;
  /** Aantal items in de wachtrij (status wachtend OF mislukt). */
  queueCount: number;
  /** Sync-pijp draait op dit moment. */
  isSyncing: boolean;
}

/**
 * Bevestigt of we echt online zijn. navigator.onLine is onbetrouwbaar en meldt soms ten onrechte
 * "offline"; daarom: als de browser "online" zegt vertrouwen we dat, en pas bij "offline" doen we
 * een echte mini-request naar /api/ping (die de service worker altijd naar het netwerk laat).
 */
async function bevestigOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine) return true;
  try {
    const res = await fetch("/api/ping", { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useOfflineState(): OfflineState {
  const [online, setOnline] = useState<boolean>(true); // optimistisch; check bevestigt bij mount
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let actief = true;

    async function refreshOnlineStatus() {
      const ok = await bevestigOnline();
      if (actief) setOnline(ok);
    }

    async function refreshQueueCount() {
      try {
        setQueueCount(await aantalInQueue());
      } catch {
        setQueueCount(0);
      }
    }

    window.addEventListener("online", refreshOnlineStatus);
    window.addEventListener("offline", refreshOnlineStatus);
    window.addEventListener("focus", refreshOnlineStatus);
    document.addEventListener("visibilitychange", refreshOnlineStatus);
    const offQueue = abonneerOpQueue(refreshQueueCount);
    const offSync = abonneerOpSync(setIsSyncing);

    refreshOnlineStatus();
    refreshQueueCount();

    return () => {
      actief = false;
      window.removeEventListener("online", refreshOnlineStatus);
      window.removeEventListener("offline", refreshOnlineStatus);
      window.removeEventListener("focus", refreshOnlineStatus);
      document.removeEventListener("visibilitychange", refreshOnlineStatus);
      offQueue();
      offSync();
    };
  }, []);

  return { online, queueCount, isSyncing };
}
