"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History, Undo2 } from "lucide-react";
import type { Melding, TerugmeldPoging } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { redenLabel } from "@/lib/terugmeld-mail";
import { OpdrachtCard } from "./OpdrachtCard";

export function HistorySection({
  meldingen,
  pogingen = [],
}: {
  meldingen: Melding[];
  /** Blijvende terugmeld-pogingen voor klussen die niet meer in de kluspool staan (read-only). */
  pogingen?: TerugmeldPoging[];
}) {
  const [open, setOpen] = useState(false);

  const totaal = meldingen.length + pogingen.length;
  if (totaal === 0) return null;

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-2 rounded-none border border-line bg-surface px-4 py-3 text-left font-semibold text-ink transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary"
      >
        <span className="inline-flex items-center gap-2">
          <History size={20} strokeWidth={2.5} aria-hidden="true" />
          Geschiedenis ({totaal})
        </span>
        {open ? (
          <ChevronUp size={22} aria-hidden="true" />
        ) : (
          <ChevronDown size={22} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {meldingen.map((m) => (
            <OpdrachtCard key={m.id} melding={m} magVerwijderen={false} />
          ))}
          {pogingen.map((p) => (
            <TerugmeldPogingKaart key={p.id} poging={p} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Read-only regel voor een teruggemelde klus die kantoor daarna aan een andere monteur gaf. Niet
 * klikbaar: de klus is niet meer van deze monteur (RLS), dit is puur zijn eigen historie.
 */
function TerugmeldPogingKaart({ poging }: { poging: TerugmeldPoging }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-2 border-dashed border-line bg-surface/60 p-4">
      <Undo2 size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-extrabold text-ink">
            {poging.klant_naam ?? "Onbekende klant"}
          </span>
          <span className="inline-flex items-center border-[1.5px] border-ink bg-ink px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-white">
            Teruggemeld
          </span>
        </div>
        <p className="mt-1 text-sm text-ink">
          Reden: <span className="font-semibold">{redenLabel(poging.reden)}</span>
          {poging.toelichting ? ` — ${poging.toelichting}` : ""}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Door jou teruggemeld op {formatDatumKort(poging.created_at)}. Kantoor heeft de klus opnieuw
          ingepland.
        </p>
      </div>
    </div>
  );
}
