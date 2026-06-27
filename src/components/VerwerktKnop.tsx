"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

/**
 * Markeert een opgeleverde klus als "verwerkt" door de zaak (nagekeken, eventueel besteld). Zet
 * afgerond_akkoord_at. Heropenen (terug naar te plannen) is een aparte actie (zie HeropenKnop).
 */
export function VerwerktKnop({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwerk() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/akkoord-afgerond`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Mislukt (${res.status})`);
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
    <div className="mt-4">
      <button
        type="button"
        onClick={verwerk}
        disabled={bezig}
        className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 bg-success px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden="true" />
        )}
        Markeer als verwerkt
      </button>
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
