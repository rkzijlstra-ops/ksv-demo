export type QuotaNiveau = "ok" | "waarschuwing" | "vol";

export interface QuotaInfo {
  niveau: QuotaNiveau;
  usageBytes: number;
  quotaBytes: number;
}

const DREMPEL_WAARSCHUWING = 300 * 1024 * 1024; // 300 MB
const DREMPEL_VOL = 500 * 1024 * 1024; // 500 MB

/**
 * Schat hoeveel storage de PWA gebruikt en vergelijkt met de drempels uit het
 * 2A.9-ontwerp (300 MB waarschuwing, 500 MB vol). Op iOS Safari kan de browser
 * de hele cache wissen rond de 1 GB, dus we houden flinke marge.
 *
 * Valt graceful terug op `ok` als `navigator.storage.estimate` niet beschikbaar
 * is (oude browsers).
 */
export async function checkQuota(): Promise<QuotaInfo> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { niveau: "ok", usageBytes: 0, quotaBytes: 0 };
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    let niveau: QuotaNiveau = "ok";
    if (usage > DREMPEL_VOL) niveau = "vol";
    else if (usage > DREMPEL_WAARSCHUWING) niveau = "waarschuwing";
    return { niveau, usageBytes: usage, quotaBytes: quota };
  } catch {
    return { niveau: "ok", usageBytes: 0, quotaBytes: 0 };
  }
}
