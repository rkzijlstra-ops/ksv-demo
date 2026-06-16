"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { AdresKeuze } from "@/components/AdresKeuze";
import type { AdresKandidaat } from "@/lib/parser-schema";

/**
 * Adres-controle op het dashboard (blok 20): de order had meerdere adressen, dus de planner kiest
 * hier bewust de montagelocatie voor de klus ingepland/verstuurd kan worden. Zolang dit blok er
 * staat, is het adres nog leeg en is plannen niet veilig.
 */
export function AdresControleBlok({
  opdrachtId,
  kandidaten,
}: {
  opdrachtId: string;
  kandidaten: AdresKandidaat[];
}) {
  const router = useRouter();
  const [adres, setAdres] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function bevestig() {
    if (!adres.trim()) {
      setFout("Kies eerst de montagelocatie.");
      return;
    }
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/adres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adres: adres.trim() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Opslaan mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="mt-6 border-2 border-urgent-rood bg-urgent-rood/5 p-4">
      <h2 className="flex items-center gap-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
        <AlertTriangle size={18} strokeWidth={2.5} aria-hidden="true" />
        Adres controleren
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Op de order stonden meerdere adressen. Plannen en versturen kan pas nadat je hieronder de
        montagelocatie hebt gekozen, zodat de monteur niet naar het verkeerde adres rijdt.
      </p>
      <div className="mt-3">
        <AdresKeuze kandidaten={kandidaten} waarde={adres} onKies={setAdres} />
      </div>
      {fout && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-urgent-rood">
          <AlertTriangle size={15} strokeWidth={2.5} aria-hidden="true" />
          {fout}
        </p>
      )}
      <button
        type="button"
        onClick={bevestig}
        disabled={bezig || !adres.trim()}
        className="mt-3 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-[filter] duration-150 hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            Opslaan…
          </>
        ) : (
          <>
            <Check size={18} strokeWidth={2.75} aria-hidden="true" />
            Adres bevestigen
          </>
        )}
      </button>
    </section>
  );
}
