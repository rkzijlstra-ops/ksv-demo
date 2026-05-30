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

export function useOfflineState(): OfflineState {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function refreshOnlineStatus() {
      setOnline(navigator.onLine);
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
    const offQueue = abonneerOpQueue(refreshQueueCount);
    const offSync = abonneerOpSync(setIsSyncing);

    refreshOnlineStatus();
    refreshQueueCount();

    return () => {
      window.removeEventListener("online", refreshOnlineStatus);
      window.removeEventListener("offline", refreshOnlineStatus);
      offQueue();
      offSync();
    };
  }, []);

  return { online, queueCount, isSyncing };
}
