"use client";

import { useState } from "react";
import { RotateCcw, Loader2, FlaskConical } from "lucide-react";

/**
 * Vaste balk bovenaan in de DEMO-omgeving: maakt duidelijk dat het nepdata is en biedt een zichtbare
 * "Speel opnieuw"-knop die de demo in één tik terugzet naar de begintoestand (en de datums naar deze
 * week). Alleen gerenderd als de layout DEMO_MODE detecteert; bestaat dus niet in productie.
 */
export function DemoBanner() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function speelOpnieuw() {
    if (!window.confirm("Demo terugzetten naar het begin? Alle wijzigingen in de demo gaan weg en de voorbeelddata komt vers terug.")) {
      return;
    }
    setBezig(true);
    setFout("");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Terugzetten mislukt (${res.status})`);
        return;
      }
      window.location.reload();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-accent px-4 py-1.5 text-white">
      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em]">
        <FlaskConical size={15} strokeWidth={2.5} aria-hidden="true" />
        Demo, voorbeelddata, geen echte klanten
      </span>
      <span className="flex items-center gap-2">
        {fout && <span className="text-[11px] font-semibold">{fout}</span>}
        <button
          type="button"
          onClick={speelOpnieuw}
          disabled={bezig}
          className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 border-2 border-white bg-white/10 px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] hover:bg-white/20 disabled:opacity-60"
        >
          {bezig ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={13} strokeWidth={2.5} aria-hidden="true" />}
          Speel opnieuw
        </button>
      </span>
    </div>
  );
}
