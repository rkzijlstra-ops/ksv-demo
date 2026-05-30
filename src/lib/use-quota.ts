"use client";

import { useEffect, useState } from "react";
import { checkQuota, type QuotaInfo } from "./quota";
import { abonneerOpQueue } from "./sync-state";

/**
 * Periodieke check van de PWA-storage (elke 30 sec) plus directe refresh zodra
 * de queue muteert (foto toegevoegd / sync klaar / item verwijderd).
 */
export function useQuota(): QuotaInfo {
  const [info, setInfo] = useState<QuotaInfo>({
    niveau: "ok",
    usageBytes: 0,
    quotaBytes: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const i = await checkQuota();
      if (!cancelled) setInfo(i);
    }
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    const off = abonneerOpQueue(() => void refresh());
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      off();
    };
  }, []);

  return info;
}
