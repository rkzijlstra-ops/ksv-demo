"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Undo2 } from "lucide-react";
import { TERUGMELD_REDENEN } from "@/lib/terugmeld-mail";
import { ActieKaart } from "@/components/ActieKaart";

/**
 * De "Niet doorgegaan"-keuze op het voltooien-keuzescherm: opent een venster met een reden en
 * optionele toelichting en meldt de klus terug aan kantoor. Gemodelleerd op TerugmeldKnop, maar als
 * keuze-rij in plaats van een kaart-knop. Terugmelden mag alleen bij een door kantoor ingeschoten klus
 * die aan deze monteur is toegewezen; de API bewaakt dat en de fout verschijnt in het venster.
 */
export function NietDoorgegaanKnop({ opdrachtId, klantNaam }: { opdrachtId: string; klantNaam: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState(TERUGMELD_REDENEN[0].waarde);
  const [toelichting, setToelichting] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function terugmelden() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/terugmelden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reden, toelichting: toelichting.trim() || null }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Terugmelden mislukt (${res.status})`);
        return;
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <ActieKaart
        accent="negatief"
        icoon={<Undo2 size={22} strokeWidth={2.5} aria-hidden="true" />}
        titel="Niet doorgegaan"
        sub="Klant niet thuis of werk niet af te ronden. Meld terug aan kantoor met een reden."
        onClick={() => setOpen(true)}
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klus terugmelden aan kantoor"
          onClick={() => {
            if (!bezig) setOpen(false);
          }}
        >
          <div className="w-full max-w-md border-2 border-ink bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-mono text-lg font-extrabold text-ink">Niet doorgegaan</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Klus voor <span className="font-bold">{klantNaam}</span>. Hij gaat terug naar kantoor om opnieuw in te plannen of af te sluiten.
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-ink">
              Reden
              <select
                value={reden}
                onChange={(e) => setReden(e.target.value)}
                className="min-h-[44px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
              >
                {TERUGMELD_REDENEN.map((r) => (
                  <option key={r.waarde} value={r.waarde}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-ink">
              Toelichting (optioneel)
              <textarea
                value={toelichting}
                onChange={(e) => setToelichting(e.target.value)}
                rows={3}
                placeholder="Bijvoorbeeld: meerdere keren aangebeld, klant niet bereikbaar."
                className="border-2 border-line bg-white p-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
              />
            </label>

            {fout && (
              <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
                <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {fout}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={terugmelden}
                disabled={bezig}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                Terugmelden
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={bezig}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
