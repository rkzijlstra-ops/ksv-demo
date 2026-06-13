"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Loader2, AlertCircle } from "lucide-react";

/**
 * Het eindoordeel van de zaak op een voltooid gemelde klus: "Akkoord, klaar" (afhandelen) of
 * "Toch nog open" (heropenen -> terug naar te plannen).
 */
export function AfgerondKeuren({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState<"akkoord" | "heropenen" | null>(null);
  const [fout, setFout] = useState("");

  async function doe(actie: "akkoord" | "heropenen") {
    setBezig(actie);
    setFout("");
    const url =
      actie === "akkoord"
        ? `/api/opdrachten/${opdrachtId}/akkoord-afgerond`
        : `/api/opdrachten/${opdrachtId}/heropenen`;
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="mt-4">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">Jullie oordeel</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => doe("akkoord")}
          disabled={bezig !== null}
          className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-success px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-success hover:bg-success/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
        >
          {bezig === "akkoord" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden="true" />}
          Akkoord, klaar
        </button>
        <button
          type="button"
          onClick={() => doe("heropenen")}
          disabled={bezig !== null}
          className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-urgent-rood px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
        >
          {bezig === "heropenen" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={18} strokeWidth={2.5} aria-hidden="true" />}
          Toch nog open
        </button>
      </div>
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
