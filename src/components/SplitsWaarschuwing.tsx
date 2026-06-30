"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Loader2, ListChecks, Check, AlertCircle } from "lucide-react";

/**
 * Waarschuwingsband bij een binnengekomen mail die mogelijk meerdere opdrachten bevat. De app heeft de
 * splitsing al voorgesteld; de gebruiker kiest: in losse klussen splitsen (één tik), of als één klus
 * bevestigen. Wordt getoond op een voorstel in de inbox en op een kantoor-klus op het dashboard/detail.
 */
export function SplitsWaarschuwing({ id, reden }: { id: string; reden: string | null }) {
  const router = useRouter();
  const [bezig, setBezig] = useState<"" | "splits" | "een">("");
  const [fout, setFout] = useState("");

  async function doe(actie: "splits" | "een", url: string) {
    setBezig(actie);
    setFout("");
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? "Actie mislukt, probeer opnieuw");
        setBezig("");
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig("");
    }
  }

  return (
    <div className="border-2 border-ink bg-urgent-geel">
      <div className="flex items-start gap-2 p-3 text-ink">
        <TriangleAlert size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold">Mogelijk meerdere opdrachten in deze mail</p>
          {reden && <p className="mt-0.5 text-sm">{reden}</p>}
          <p className="mt-0.5 text-sm">Splits ze in aparte klussen, of bevestig als één klus.</p>
        </div>
      </div>
      <div className="flex gap-2 border-t-2 border-ink p-2">
        <button
          type="button"
          onClick={() => doe("splits", `/api/inbound/${id}/splitsen`)}
          disabled={!!bezig}
          className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-3 text-sm font-extrabold uppercase tracking-[0.03em] text-ink transition-colors hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig === "splits" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <ListChecks size={16} strokeWidth={2.5} aria-hidden="true" />
          )}
          Splits in aparte klussen
        </button>
        <button
          type="button"
          onClick={() => doe("een", `/api/inbound/${id}/bevestigen`)}
          disabled={!!bezig}
          className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-3 text-sm font-extrabold uppercase tracking-[0.03em] text-ink transition-colors hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig === "een" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={16} strokeWidth={2.75} aria-hidden="true" />
          )}
          Het is er één
        </button>
      </div>
      {fout && (
        <p className="flex items-start gap-2 border-t-2 border-ink px-3 py-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
