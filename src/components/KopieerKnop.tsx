"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Subtiel kopieer-knopje: kopieert een stukje tekst (bv. het inbound-mailadres) naar het klembord en
 * toont kort "Gekopieerd". Ingetogen vormgegeven, geen grote balk. Faalt stil als het klembord
 * geblokkeerd is (de tekst staat ernaast en is ook met de hand te selecteren).
 */
export function KopieerKnop({ tekst, label = "Kopieer" }: { tekst: string; label?: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      // klembord niet beschikbaar (permissie/oude browser): stil laten, tekst is handmatig te kopiëren.
    }
  }

  return (
    <button
      type="button"
      onClick={kopieer}
      aria-label={`${label}: ${tekst}`}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-3 focus-visible:outline-accent"
    >
      {gekopieerd ? (
        <>
          <Check size={14} strokeWidth={2.5} className="text-success" aria-hidden="true" />
          Gekopieerd
        </>
      ) : (
        <>
          <Copy size={14} strokeWidth={2.25} aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}
