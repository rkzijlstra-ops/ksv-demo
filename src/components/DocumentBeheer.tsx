"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, ExternalLink, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import type { Document } from "@/lib/db";

/**
 * Documentbeheer voor kantoor op de opdracht-detailpagina: de documenten openen, een document
 * verwijderen (met bevestiging, ook de bron-pdf) en een nieuw document bijvoegen (als bijlage, zonder
 * opnieuw inlezen). Gebruikt de bestaande routes; na elke actie ververst de serverweergave.
 */
export function DocumentBeheer({
  opdrachtId,
  documenten,
}: {
  opdrachtId: string;
  documenten: Document[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [bezigId, setBezigId] = useState<string | null>(null);
  const [uploadt, setUploadt] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijder(doc: Document) {
    const extra = doc.is_primair ? " Dit is het bronbestand van de klus." : "";
    if (!window.confirm(`"${doc.bestandsnaam}" verwijderen?${extra}`)) return;
    setBezigId(doc.id);
    setFout("");
    try {
      const res = await fetch(`/api/documenten/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Verwijderen mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezigId(null);
    }
  }

  async function bijvoegen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (e.target) e.target.value = ""; // zelfde bestand opnieuw kunnen kiezen
    if (files.length === 0) return;
    setUploadt(true);
    setFout("");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/opdrachten/${opdrachtId}/documenten`, { method: "POST", body: fd });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Bijvoegen mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setUploadt(false);
    }
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Documenten ({documenten.length})
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadt}
          className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 border-2 border-primary px-3 text-xs font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
        >
          {uploadt ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Plus size={15} strokeWidth={2.5} aria-hidden="true" />}
          Bijvoegen
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          onChange={bijvoegen}
          className="hidden"
        />
      </div>

      {documenten.length === 0 ? (
        <p className="text-sm text-ink-muted">Geen documenten bij deze klus.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documenten.map((doc) => (
            <li key={doc.id} className="flex min-h-[52px] items-center gap-3 border border-line bg-white p-3">
              {doc.type === "pdf" ? (
                <FileText size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
              ) : (
                <ImageIcon size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
              )}
              <a
                href={doc.publieke_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-ink hover:opacity-80"
              >
                <span className="min-w-0 flex-1 truncate">{doc.bestandsnaam}</span>
                <ExternalLink size={16} className="shrink-0 text-primary" aria-hidden="true" />
              </a>
              {doc.is_primair && (
                <span className="shrink-0 bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">bron</span>
              )}
              <button
                type="button"
                onClick={() => verwijder(doc)}
                disabled={bezigId === doc.id}
                aria-label={`Document ${doc.bestandsnaam} verwijderen`}
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border border-urgent-rood text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezigId === doc.id ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </section>
  );
}
