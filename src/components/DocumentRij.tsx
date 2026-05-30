"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, ExternalLink, Trash2, Loader2 } from "lucide-react";
import type { Document } from "@/lib/db";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

export function DocumentRij({ doc }: { doc: Document }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijder() {
    if (!window.confirm(`Document "${doc.bestandsnaam}" verwijderen?`)) return;
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/documenten/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Verwijderen mislukt (${res.status})`);
        setBezig(false);
        return;
      }
      router.refresh();
      vernieuwOfflineCache();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setBezig(false);
    }
  }

  return (
    <li>
      <div className="flex min-h-[56px] items-center gap-2 rounded-none border border-line bg-white p-3">
        <a
          href={doc.publieke_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 transition-colors duration-150 hover:opacity-80 focus-visible:outline-3 focus-visible:outline-primary"
        >
          {doc.type === "pdf" ? (
            <FileText size={22} className="shrink-0 text-ink-muted" aria-hidden="true" />
          ) : (
            <ImageIcon size={22} className="shrink-0 text-ink-muted" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{doc.bestandsnaam}</span>
          {doc.is_primair && (
            <span className="shrink-0 rounded-none bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
              bron
            </span>
          )}
          <ExternalLink size={18} className="shrink-0 text-primary" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={verwijder}
          disabled={bezig}
          aria-label={`Document ${doc.bestandsnaam} verwijderen`}
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-none border border-line text-urgent-rood transition-colors duration-150 hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          {bezig ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 size={18} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      </div>
      {fout && <p className="mt-1 text-sm font-semibold text-urgent-rood">{fout}</p>}
    </li>
  );
}
