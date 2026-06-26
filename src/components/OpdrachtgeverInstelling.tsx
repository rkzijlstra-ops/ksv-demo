"use client";

import { useState } from "react";
import { Users } from "lucide-react";

/**
 * Schakelaar per opdrachtgever: mag de monteur de oplevering ook rechtstreeks aan de klant sturen?
 * Optimistisch togglen; bij een fout terugdraaien. Alleen zichtbaar voor de beheerder (de pagina gate't).
 */
export function OpdrachtgeverInstelling({
  id,
  naam,
  aan: aanInit,
}: {
  id: string;
  naam: string;
  aan: boolean;
}) {
  const [aan, setAan] = useState(aanInit);
  const [bezig, setBezig] = useState(false);

  async function toggle() {
    const nieuw = !aan;
    setBezig(true);
    setAan(nieuw);
    try {
      const res = await fetch(`/api/opdrachtgever/${id}/instellingen`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klant_levering_toegestaan: nieuw }),
      });
      if (!res.ok) setAan(!nieuw);
    } catch {
      setAan(!nieuw);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex items-center gap-3 border-2 border-line bg-white px-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-muted/10 text-ink-muted">
        <Users size={18} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-extrabold text-ink">{naam}</p>
        <p className="text-xs text-ink-muted">Ook aan de klant opleveren toestaan</p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={bezig}
        aria-pressed={aan}
        aria-label={`Klant-levering voor ${naam} ${aan ? "uitzetten" : "aanzetten"}`}
        className={`min-h-[40px] shrink-0 cursor-pointer border-2 px-4 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60 ${
          aan ? "border-success bg-success text-white" : "border-line bg-white text-ink-muted"
        }`}
      >
        {aan ? "Aan" : "Uit"}
      </button>
    </div>
  );
}
