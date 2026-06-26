"use client";

import type { ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import type { Document } from "@/lib/db";
import { documentSoort, documentMeta } from "@/lib/document-weergave";
import { DocumentVoorbeeld } from "./DocumentVoorbeeld";

/**
 * Eén documentregel, gedeeld door monteur en kantoor: mini-voorbeeld + soort-label + naam, en een
 * "Open"-knop die het document IN de app opent (via de PdfViewer, niet meer in een nieuw tabblad).
 * `actie` is een optionele extra knop (bv. verwijderen bij kantoor).
 */
export function DocumentKaart({
  doc,
  onOpen,
  actie,
}: {
  doc: Document;
  onOpen: (doc: Document) => void;
  actie?: ReactNode;
}) {
  const soort = documentSoort(doc.bestandsnaam, doc.type);
  const meta = documentMeta(soort);

  return (
    <div className="flex items-center gap-3 border border-line bg-white p-2.5">
      <button
        type="button"
        onClick={() => onOpen(doc)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-3 focus-visible:outline-accent"
        aria-label={`${meta.label} ${doc.bestandsnaam} openen`}
      >
        <DocumentVoorbeeld url={doc.publieke_url} type={doc.type} iconKey={meta.iconKey} alt={meta.label} />
        <span className="min-w-0 flex-1">
          <span
            className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.04em] ${
              doc.type === "pdf" ? "border-accent bg-accent/10" : "border-line bg-surface text-ink-muted"
            }`}
            style={doc.type === "pdf" ? { color: "#b45309" } : undefined}
          >
            {meta.label}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-ink">{doc.bestandsnaam}</span>
          {doc.is_primair && <span className="text-xs text-ink-muted">bron</span>}
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-primary text-primary">
          <Maximize2 size={16} strokeWidth={2.5} aria-hidden="true" />
        </span>
      </button>
      {actie}
    </div>
  );
}
