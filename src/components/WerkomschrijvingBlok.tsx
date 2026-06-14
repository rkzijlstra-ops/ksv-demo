"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil, Plus, Check, X, Loader2, AlertCircle } from "lucide-react";
import { SpraakOpname } from "@/components/SpraakOpname";

/**
 * Toont en bewerkt de werk-omschrijving ("wat moet er gebeuren") van een klus. Puur intern: deze tekst
 * komt niet in het opleverrapport. Bewerken mag de toegewezen monteur op zijn eigen klus (en kantoor);
 * de route dekt de rechten af. Typen én inspreken, net als bij een melding.
 */
export function WerkomschrijvingBlok({
  opdrachtId,
  initieel,
}: {
  opdrachtId: string;
  initieel: string | null;
}) {
  const router = useRouter();
  const [tekst, setTekst] = useState(initieel ?? "");
  const [bewerken, setBewerken] = useState(false);
  const [concept, setConcept] = useState(initieel ?? "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  function start() {
    setConcept(tekst);
    setFout("");
    setBewerken(true);
  }

  function annuleer() {
    setBewerken(false);
    setFout("");
  }

  async function opslaan() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/werkomschrijving`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ werkomschrijving: concept.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Opslaan mislukt (${res.status})`);
      setTekst(concept.trim());
      setBewerken(false);
      router.refresh();
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setBezig(false);
    }
  }

  if (bewerken) {
    return (
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          Wat moet er gebeuren?
        </h2>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          rows={3}
          placeholder="Bijv. kasten nastellen. Typ of spreek in."
          className="min-h-[72px] w-full rounded-none border border-line bg-white p-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
        />
        <p className="mt-1 text-xs text-ink-muted">Alleen voor jezelf, komt niet in het opleverrapport.</p>
        <div className="mt-2">
          <SpraakOpname onTekst={(t) => setConcept((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
        {fout && (
          <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
            <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {fout}
          </p>
        )}
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig}
            className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-ink hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bezig ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} strokeWidth={2.75} aria-hidden="true" />}
            Opslaan
          </button>
          <button
            type="button"
            onClick={annuleer}
            disabled={bezig}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 border-2 border-line bg-white px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
            Annuleren
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
        Wat moet er gebeuren?
      </h2>
      {tekst ? (
        <div className="rounded-none border border-line bg-white p-4">
          <p className="flex items-start gap-2 font-[family-name:var(--font-body)] text-base text-ink">
            <ClipboardList size={20} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
            {tekst}
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-1 border border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
            Bewerken
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary"
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
          Werk-omschrijving toevoegen
        </button>
      )}
    </section>
  );
}
