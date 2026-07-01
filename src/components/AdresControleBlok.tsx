"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { AdresKeuze } from "@/components/AdresKeuze";
import type { AdresKandidaat } from "@/lib/parser-schema";

/**
 * Adres-controle (blok 20) op de detailpagina, kantoor én monteur: de order had meerdere adressen, dus
 * hier kiest een mens bewust de montagelocatie voor er gepland/verstuurd kan worden. Hergebruikt exact
 * dezelfde AdresKeuze als bij het invoeren, zodat de keuze er overal hetzelfde uitziet (geen apart rood
 * kader eromheen); het enige verschil is de eigen bevestig-knop, want dit corrigeert een bestaande klus
 * en heeft dus zijn eigen opslag-actie. Zolang dit blok er staat, is het adres nog leeg en plannen niet
 * veilig.
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
    <section className="mt-6 flex flex-col gap-3">
      <AdresKeuze kandidaten={kandidaten} waarde={adres} onKies={setAdres} />
      {fout && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-urgent-rood">
          <AlertTriangle size={15} strokeWidth={2.5} aria-hidden="true" />
          {fout}
        </p>
      )}
      <button
        type="button"
        onClick={bevestig}
        disabled={bezig || !adres.trim()}
        className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-[filter] duration-150 hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
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
