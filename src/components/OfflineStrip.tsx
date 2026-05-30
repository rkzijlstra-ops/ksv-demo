"use client";

import { CloudOff, Loader2 } from "lucide-react";
import { useOfflineState } from "@/lib/use-offline-state";

/**
 * Dunne statusstrip helemaal bovenaan de viewport, alleen zichtbaar als er iets
 * te melden valt. Drie staten:
 *  - offline (queue=0): oranje balk "Offline"
 *  - offline (queue>0): oranje balk "Offline - X wachtend"
 *  - online + syncing: groene balk "Bezig met versturen..."
 *  - online + queue>0 + niet syncing (kort moment tussen sync-pogingen): oranje
 *    "X wacht op netwerk - probeer opnieuw"
 *  - online + queue=0 + niet syncing: verborgen
 */
export function OfflineStrip() {
  const { online, queueCount, isSyncing } = useOfflineState();

  if (online && queueCount === 0 && !isSyncing) return null;

  let tekst: string;
  let kleur: string;
  let Icoon = CloudOff;

  if (isSyncing) {
    tekst = queueCount > 0 ? `Bezig met versturen… ${queueCount} over` : "Bezig met versturen…";
    kleur = "bg-success";
    Icoon = Loader2;
  } else if (!online) {
    tekst = queueCount === 0 ? "Offline" : `Offline – ${queueCount} ${queueCount === 1 ? "wacht" : "wachten"}`;
    kleur = "bg-accent";
  } else {
    tekst = `${queueCount} ${queueCount === 1 ? "melding wacht" : "meldingen wachten"} op netwerk`;
    kleur = "bg-accent";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] text-white ${kleur}`}
    >
      <Icoon size={14} strokeWidth={2.5} className={isSyncing ? "animate-spin" : ""} aria-hidden="true" />
      {tekst}
    </div>
  );
}
