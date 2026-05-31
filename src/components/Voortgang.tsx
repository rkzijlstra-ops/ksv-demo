"use client";

import { clampPercent } from "@/lib/voortgang";

/**
 * Voortgangsbalk. Met `percent` (0-100) een echte balk, zonder percent een
 * onbepaalde (pulserende) balk. `label` zegt wat er gebeurt.
 */
export function Voortgang({ label, percent }: { label: string; percent?: number | null }) {
  const bepaald = typeof percent === "number";
  const pct = bepaald ? clampPercent(percent as number) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm font-semibold text-ink">
        <span>{label}</span>
        {bepaald && <span className="font-mono text-ink-muted">{pct}%</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-none bg-line" role="progressbar">
        {bepaald ? (
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-primary" />
        )}
      </div>
    </div>
  );
}
