"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { Melding } from "@/lib/db";
import { OpdrachtCard } from "./OpdrachtCard";

export function HistorySection({ meldingen }: { meldingen: Melding[] }) {
  const [open, setOpen] = useState(false);

  if (meldingen.length === 0) return null;

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
          Geschiedenis ({meldingen.length})
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
        </div>
      )}
    </section>
  );
}
