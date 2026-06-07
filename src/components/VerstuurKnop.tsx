"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check, AlertCircle, AlertTriangle } from "lucide-react";

/**
 * Verstuur-poort-knop: zet de meegegeven concept/gewijzigde opdrachten op 'gepland'.
 * Toont een fout bij een serverprobleem en een waarschuwing als de mail niet uitging.
 */
export function VerstuurKnop({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");
  const [mailWaarschuwing, setMailWaarschuwing] = useState("");

  const aantal = ids.length;

  async function versturen() {
    setBezig(true);
    setFout("");
    setMailWaarschuwing("");
    try {
      const res = await fetch("/api/dashboard/versturen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.mailWaarschuwing) setMailWaarschuwing(body.mailWaarschuwing);
        setKlaar(true);
        router.refresh();
        setTimeout(() => setKlaar(false), 3000);
      } else {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Versturen mislukt (${res.status})`);
      }
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  // Niets meer te versturen: blauwe status-indicator (kleuren conform de schermen: primary = blauw).
  if (aantal === 0 && !klaar) {
    return (
      <span className="inline-flex items-center gap-2 border-2 border-primary bg-white px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.04em] text-primary">
        <Check size={15} strokeWidth={2.5} aria-hidden="true" />
        Alles verzonden
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={versturen}
        disabled={bezig || aantal === 0}
        className="inline-flex cursor-pointer items-center gap-2 border-2 border-accent bg-white px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.04em] text-accent hover:bg-accent/10 disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : klaar ? (
          <Check size={15} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <Send size={15} strokeWidth={2.4} aria-hidden="true" />
        )}
        {klaar ? "Verstuurd" : `Verstuur naar monteurs (${aantal})`}
      </button>
      {fout && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-urgent-rood">
          <AlertCircle size={13} strokeWidth={2.5} aria-hidden="true" />
          {fout}
        </p>
      )}
      {mailWaarschuwing && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <AlertTriangle size={13} strokeWidth={2.5} aria-hidden="true" />
          Status bijgewerkt, maar: {mailWaarschuwing}
        </p>
      )}
    </div>
  );
}
