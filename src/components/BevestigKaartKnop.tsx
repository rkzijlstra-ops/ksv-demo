"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, AlertCircle } from "lucide-react";

/**
 * Compacte "Ontvangst bevestigen"-knop op een werkpool-kaart, zodat de monteur direct vanaf het
 * overzicht kan bevestigen (klant, adres en datum staan al op de kaart). Zit in de klikbare kaart,
 * dus de klik wordt onderschept (geen navigatie naar detail). Alleen zichtbaar bij status 'gepland';
 * bij 'bevestigd' toont de kaart enkel de badge. De volledige knop staat ook op het detailscherm.
 */
export function BevestigKaartKnop({
  opdrachtId,
  status,
}: {
  opdrachtId: string;
  status: string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  if (status !== "gepland") return null;

  async function bevestig(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/bevestigen`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Bevestigen mislukt (${res.status})`);
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
    <div className="mt-2.5">
      <button
        type="button"
        onClick={bevestig}
        disabled={bezig}
        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 border-2 border-bevestigd bg-bevestigd px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardCheck size={16} strokeWidth={2.5} aria-hidden="true" />
        )}
        Ontvangst bevestigen
      </button>
      {fout && (
        <p className="mt-1.5 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
