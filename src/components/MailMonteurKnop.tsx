"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MailCheck, Loader2, AlertCircle } from "lucide-react";

/**
 * Envelop-knop op een opdracht-kaart: mailt deze ene opdracht naar de toegewezen monteur en zet
 * hem op 'gepland'. Alleen tonen bij een opdracht die nog te versturen is. Stopt het doorklikken
 * naar de onderliggende kaart-link en het slepen.
 */
export function MailMonteurKnop({ opdrachtId, label }: { opdrachtId: string; label?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "bezig" | "klaar" | "fout">("idle");

  async function verstuur(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status === "bezig") return;
    setStatus("bezig");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/mail-monteur`, { method: "POST" });
      if (res.ok) {
        setStatus("klaar");
        router.refresh();
      } else {
        setStatus("fout");
      }
    } catch {
      setStatus("fout");
    }
  }

  const Icon =
    status === "bezig" ? Loader2 : status === "klaar" ? MailCheck : status === "fout" ? AlertCircle : Mail;
  const kleur =
    status === "fout"
      ? "border-urgent-rood text-urgent-rood"
      : status === "klaar"
        ? "border-success text-success"
        : "border-accent text-accent";

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={verstuur}
      title="Mail deze klus naar de monteur"
      aria-label="Mail deze klus naar de monteur"
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 border-[1.5px] bg-white px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em] ${kleur}`}
    >
      <Icon
        size={13}
        strokeWidth={2.4}
        className={status === "bezig" ? "animate-spin" : ""}
        aria-hidden="true"
      />
      {label && <span>{status === "klaar" ? "Verstuurd" : "Mail"}</span>}
    </button>
  );
}
