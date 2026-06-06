"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle, ClipboardCheck } from "lucide-react";

/**
 * Laat de monteur de ontvangst van een verstuurde klus bevestigen (uit de opdracht-mail).
 * Zichtbaar bij status 'gepland' (verstuurd, nog te bevestigen); na bevestigen een groene melding.
 */
export function BevestigOntvangstKnop({
  opdrachtId,
  status,
}: {
  opdrachtId: string;
  status: string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  if (status === "bevestigd") {
    return (
      <div className="mt-4 flex items-center gap-2 border border-bevestigd bg-bevestigd/10 p-3 font-bold text-bevestigd">
        <CheckCircle2 size={20} strokeWidth={2.5} aria-hidden="true" />
        Ontvangst bevestigd
      </div>
    );
  }
  if (status !== "gepland") return null;

  async function bevestig() {
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
    <div className="mt-4">
      <button
        type="button"
        onClick={bevestig}
        disabled={bezig}
        className="relative flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 bg-bevestigd px-4 text-base font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
      >
        {bezig ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardCheck size={20} strokeWidth={2.5} aria-hidden="true" />
        )}
        Ontvangst bevestigen
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
