"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, Loader2, AlertCircle } from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

export function PrullenbakActies({
  opdrachtId,
  klantNaam,
}: {
  opdrachtId: string;
  klantNaam: string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function herstel() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/herstellen`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Herstellen mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      router.refresh();
      vernieuwOfflineCache();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  async function definitief() {
    if (
      !window.confirm(
        `"${klantNaam}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      )
    )
      return;
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/definitief`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Verwijderen mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      router.refresh();
      vernieuwOfflineCache();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={herstel}
          disabled={bezig}
          className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-primary bg-white px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
        >
          {bezig ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
          )}
          Herstellen
        </button>
        <button
          type="button"
          onClick={definitief}
          disabled={bezig}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-none border border-urgent-rood px-3 text-sm font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
          Definitief
        </button>
      </div>
      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
