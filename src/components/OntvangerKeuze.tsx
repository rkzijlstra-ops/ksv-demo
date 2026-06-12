"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { KEUKENZAKEN } from "@/lib/keukenzaken";
import type { Adres } from "@/lib/db";

/**
 * Eigen, in-stijl keuzelijst voor de rapport-ontvanger. Vervangt de native <select>, waarvan het
 * dropdown-venster door het besturingssysteem wordt getekend en niet vorm te geven is. Zelfde keuzes
 * en waarden als voorheen ("" leeg, "adr:<id>" eigen adres, <zaaknaam>, "__anders__").
 */
export function OntvangerKeuze({
  value,
  adresboek,
  onKies,
}: {
  value: string;
  adresboek: Adres[];
  onKies: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sluiten als je ernaast tikt of Escape drukt.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const huidigAdres = adresboek.find((a) => `adr:${a.id}` === value);
  const huidigeZaak = KEUKENZAKEN.find((z) => z.naam === value);
  const label =
    value === "__anders__"
      ? "Anders (typ zelf)"
      : huidigAdres
        ? huidigAdres.naam
        : huidigeZaak
          ? huidigeZaak.naam
          : "Kies een ontvanger…";
  const isPlaceholder = value === "";

  function kies(v: string) {
    onKies(v);
    setOpen(false);
  }

  const itemClass = (actief: boolean) =>
    `flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-base hover:bg-surface focus-visible:bg-surface focus-visible:outline-none ${
      actief ? "bg-surface font-bold text-ink" : "text-ink"
    }`;
  const kopClass =
    "border-b border-line bg-surface px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink-muted";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-none border border-line bg-white px-3 text-left text-base focus-visible:outline-3 focus-visible:outline-primary"
      >
        <span className={`truncate ${isPlaceholder ? "text-ink-muted" : "text-ink"}`}>{label}</span>
        <ChevronDown
          size={20}
          strokeWidth={2.4}
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto border-2 border-ink bg-white shadow-md"
        >
          {adresboek.length > 0 && (
            <>
              <p className={kopClass}>Mijn adressen</p>
              {adresboek.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={`adr:${a.id}` === value}
                  onClick={() => kies(`adr:${a.id}`)}
                  className={itemClass(`adr:${a.id}` === value)}
                >
                  {a.naam}
                </button>
              ))}
            </>
          )}

          <p className={kopClass}>Keukenzaken</p>
          {KEUKENZAKEN.map((z) => (
            <button
              key={z.naam}
              type="button"
              role="option"
              aria-selected={z.naam === value}
              onClick={() => kies(z.naam)}
              className={itemClass(z.naam === value)}
            >
              {z.naam}
            </button>
          ))}

          <button
            type="button"
            role="option"
            aria-selected={value === "__anders__"}
            onClick={() => kies("__anders__")}
            className={`${itemClass(value === "__anders__")} border-t-2 border-line`}
          >
            Anders (typ zelf)
          </button>
        </div>
      )}
    </div>
  );
}
