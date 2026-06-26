"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import type { Document } from "@/lib/db";
import { HydratieKlaar } from "@/components/HydratieKlaar";
import { DocumentenBlok } from "@/components/DocumentenBlok";

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
      <HydratieKlaar />
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

      <DocumentenBlok
        documenten={documenten}
        actieVoorDoc={(doc) => (
          <button
            type="button"
            onClick={() => verwijder(doc)}
            disabled={bezigId === doc.id}
            aria-label={`Document ${doc.bestandsnaam} verwijderen`}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-urgent-rood text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
          >
            {bezigId === doc.id ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        )}
      />

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </section>
  );
}
