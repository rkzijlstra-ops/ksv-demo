"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Loader2, Check } from "lucide-react";

/**
 * Demo-only knop: zet de testgegevens (allowlist-nummer/mail van de tester) op een te-plannen klus, zodat
 * de tester zelf echte SMS/mail binnenkrijgt zodra hij die klus inplant en verstuurt.
 */
export function DemoMijnKlusKnop() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "bezig" | "klaar">("idle");
  const [fout, setFout] = useState("");

  async function zet() {
    setStatus("bezig");
    setFout("");
    try {
      const res = await fetch("/api/demo/mijn-klus", { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? "Mislukt");
        setStatus("idle");
        return;
      }
      setStatus("klaar");
      router.refresh();
    } catch {
      setFout("Netwerkfout");
      setStatus("idle");
    }
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        onClick={zet}
        disabled={status === "bezig"}
        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 border-2 border-ink px-3 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface disabled:opacity-60"
      >
        {status === "bezig" ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : status === "klaar" ? (
          <Check size={14} strokeWidth={2.5} className="text-success" aria-hidden="true" />
        ) : (
          <Smartphone size={14} strokeWidth={2.5} aria-hidden="true" />
        )}
        {status === "klaar" ? "Staat op een te-plannen klus" : "Zet mijn testnummer op een klus"}
      </button>
      {fout && <span className="text-[11px] font-semibold text-urgent-rood">{fout}</span>}
    </span>
  );
}
