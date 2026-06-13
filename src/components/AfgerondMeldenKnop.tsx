"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

/**
 * "Afgerond melden": de snelle eind-weg voor een (service)klus. Optioneel een notitie en een vinkje
 * "er komt nog een vervolg". De zaak krijgt bericht. Gemodelleerd op TerugmeldKnop (modal-patroon).
 */
export function AfgerondMeldenKnop({ opdrachtId, klantNaam }: { opdrachtId: string; klantNaam: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toelichting, setToelichting] = useState("");
  const [vervolg, setVervolg] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function melden() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/afgerond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toelichting: toelichting.trim() || null, vervolgNodig: vervolg }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Afronden mislukt (${res.status})`);
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-base font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
      >
        <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />
        Afgerond melden
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klus afgerond melden"
          onClick={() => { if (!bezig) setOpen(false); }}
        >
          <div className="w-full max-w-md border-2 border-ink bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-mono text-lg font-extrabold text-ink">Afgerond melden</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Klus voor <span className="font-bold">{klantNaam}</span>. De zaak krijgt bericht dat hij klaar is.
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-ink">
              Notitie (optioneel)
              <textarea
                value={toelichting}
                onChange={(e) => setToelichting(e.target.value)}
                rows={3}
                placeholder="Bijv. lade afgesteld, alles getest, klant tevreden."
                className="border-2 border-line bg-white p-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
              />
            </label>

            <label className="mt-3 flex items-start gap-3 border-2 border-urgent-geel bg-[#fffbeb] p-3 text-sm">
              <input
                type="checkbox"
                checked={vervolg}
                onChange={(e) => setVervolg(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
              <span>
                <span className="font-bold text-ink">Er komt nog een vervolg</span>
                <span className="block text-ink-muted">
                  Bijv. onderdelen die later binnenkomen. De klus gaat dan terug naar de zaak om opnieuw in te plannen.
                </span>
              </span>
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
                onClick={melden}
                disabled={bezig}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                Afgerond melden
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
