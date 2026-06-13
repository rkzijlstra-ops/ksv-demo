"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

export function VerwijderKnop({
  opdrachtId,
  klantNaam,
}: {
  opdrachtId: string;
  klantNaam: string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijder() {
    const ok = window.confirm(
      `Klus "${klantNaam}" definitief verwijderen? De documenten en meldingen gaan ook weg. Dit kan niet ongedaan worden gemaakt.`,
    );
    if (!ok) return;

    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Verwijderen mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      router.push("/");
      router.refresh();
      vernieuwOfflineCache();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={verwijder}
        disabled={bezig}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-none border border-urgent-rood px-3 text-sm font-semibold text-urgent-rood transition-colors duration-150 hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
        )}
        Klus verwijderen
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
