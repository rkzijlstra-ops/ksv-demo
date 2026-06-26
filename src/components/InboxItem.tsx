"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2, ChevronRight, Loader2, AlertCircle } from "lucide-react";

/**
 * Eén voorstel in het "te verwerken"-bakje (binnengekomen per mail). De monteur kan het openen om de
 * gegevens en bijlagen te bekijken, bevestigen (dan wordt het een gewone klus in de kluspool) of
 * weggooien (soft-delete).
 */
export function InboxItem({
  id,
  titel,
  referentie,
  adres,
}: {
  id: string;
  titel: string;
  referentie: string | null;
  adres: string | null;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState<"" | "bevestig" | "weg">("");
  const [fout, setFout] = useState("");

  async function bevestig() {
    setBezig("bevestig");
    setFout("");
    try {
      const res = await fetch(`/api/inbound/${id}/bevestigen`, { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? "Bevestigen mislukt");
        setBezig("");
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig("");
    }
  }

  async function weggooien() {
    if (!window.confirm(`"${titel}" weggooien? Het voorstel verdwijnt uit je bakje.`)) return;
    setBezig("weg");
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? "Weggooien mislukt");
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
    <li className="border-2 border-ink bg-white">
      <Link
        href={`/opdracht/${id}`}
        className="flex items-center gap-3 border-b border-line p-4 transition-colors hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
      >
        <div className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold text-ink">{titel}</span>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {referentie && <span className="font-mono font-bold">{referentie}</span>}
            {adres && <span className="truncate">{adres}</span>}
          </div>
        </div>
        <ChevronRight size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
      </Link>

      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={bevestig}
          disabled={!!bezig}
          className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink transition-[filter] hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig === "bevestig" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={16} strokeWidth={2.75} aria-hidden="true" />
          )}
          Bevestigen
        </button>
        <button
          type="button"
          onClick={weggooien}
          disabled={!!bezig}
          aria-label={`${titel} weggooien`}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-urgent-rood text-urgent-rood transition-colors hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
        >
          {bezig === "weg" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      </div>

      {fout && (
        <p className="flex items-start gap-2 px-3 pb-3 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </li>
  );
}
