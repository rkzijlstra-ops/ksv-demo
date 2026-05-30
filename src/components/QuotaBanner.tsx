"use client";

import { HardDrive, AlertCircle } from "lucide-react";
import { useQuota } from "@/lib/use-quota";

function mb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Smalle banner onder de offline-strip die alleen verschijnt als de
 * PWA-wachtrij richting de browser-storage-limiet loopt. Drempels in
 * `src/lib/quota.ts`.
 */
export function QuotaBanner() {
  const { niveau, usageBytes } = useQuota();

  if (niveau === "ok") return null;

  const isVol = niveau === "vol";
  const tekst = isVol
    ? `Wachtrij vol (${mb(usageBytes)} MB) – maak geen foto's meer tot je netwerk hebt`
    : `Wachtrij wordt groot (${mb(usageBytes)} MB) – zoek netwerk op zodra mogelijk`;

  return (
    <div
      role="alert"
      className={`sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] text-white ${
        isVol ? "bg-urgent-rood" : "bg-accent"
      }`}
    >
      {isVol ? (
        <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <HardDrive size={14} strokeWidth={2.5} aria-hidden="true" />
      )}
      {tekst}
    </div>
  );
}
