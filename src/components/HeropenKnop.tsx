"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2, AlertCircle } from "lucide-react";

/**
 * "Heropenen" op de kantoor-detailpagina van een al OPGELEVERDE klus: de klant belt, er moet toch nog
 * iets gebeuren. De klus gaat terug naar "te plannen" (met een "Heropend"-markering) en kantoor kan een
 * instructie voor de monteur meegeven (komt in de werkomschrijving). De oplever-historie blijft bewaard.
 */
export function HeropenKnop({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instructie, setInstructie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function heropen() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/heropenen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructie: instructie.trim() || null }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Heropenen mislukt (${res.status})`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="mt-6 border-2 border-line bg-white p-4">
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">Toch nog iets te doen?</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Heropen de klus om hem terug naar de planning te zetten. De oplever-historie blijft bewaard.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-2 border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
      >
        <RotateCcw size={16} strokeWidth={2.5} aria-hidden="true" />
        Heropenen
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klus heropenen"
          onClick={() => {
            if (!bezig) setOpen(false);
          }}
        >
          <div className="w-full max-w-md border-2 border-ink bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-mono text-lg font-extrabold text-ink">Klus heropenen</h2>
            <p className="mt-1 text-sm text-ink-muted">
              De klus gaat terug naar &quot;te plannen&quot; en krijgt een &quot;Heropend&quot;-markering.
              Geef eventueel een instructie mee voor de monteur.
            </p>

            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-ink">
              Instructie voor de monteur (optioneel)
              <textarea
                value={instructie}
                onChange={(e) => setInstructie(e.target.value)}
                rows={3}
                placeholder="Bijvoorbeeld: lade loopt stroef, geleider afstellen."
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
                onClick={heropen}
                disabled={bezig}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                Heropenen
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
    </section>
  );
}
