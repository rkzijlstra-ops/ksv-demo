"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

export function MeldingVerwijderKnop({ meldingId }: { meldingId: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder() {
    if (!window.confirm("Deze melding verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBezig(true);
    try {
      const res = await fetch(`/api/meldingen/${meldingId}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        window.alert(b.error ?? `Verwijderen mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      router.refresh();
      vernieuwOfflineCache();
    } catch {
      window.alert("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={verwijder}
      disabled={bezig}
      aria-label="Melding verwijderen"
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-urgent-rood text-urgent-rood transition-colors duration-150 hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
    >
      {bezig ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
      )}
    </button>
  );
}
