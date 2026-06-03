"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check } from "lucide-react";

/**
 * Verstuur-poort-knop: zet de meegegeven concept/gewijzigde opdrachten op 'gepland'.
 * De mail naar de monteurs volgt in blok 4; dit is voorlopig alleen de statussprong.
 */
export function VerstuurKnop({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);

  const aantal = ids.length;
  if (aantal === 0) return null;

  async function versturen() {
    setBezig(true);
    try {
      const res = await fetch("/api/dashboard/versturen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setKlaar(true);
        router.refresh();
        setTimeout(() => setKlaar(false), 3000);
      }
    } finally {
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={versturen}
      disabled={bezig}
      className="inline-flex cursor-pointer items-center gap-2 border-2 border-accent bg-accent px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.04em] text-white disabled:opacity-60"
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
  );
}
