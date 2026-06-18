"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Undo2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { TERUGMELD_REDENEN } from "@/lib/terugmeld-mail";

/**
 * "Terugmelden aan kantoor" op een werkpool-kaart bij een door kantoor ingeschoten klus die de monteur
 * niet rond kreeg. Opent een venster met een reden en optionele toelichting. De klus verdwijnt daarna
 * uit zijn actieve pool (komt in zijn history) en kantoor krijgt bericht.
 *
 * De kaart is één grote klikbare <Link>; het venster zou als DOM-kind daarvan de klik naar de
 * detailpagina laten doorslaan (de "flits"-bug) en is bovendien ongeldige HTML (interactieve elementen
 * in een <a>). Daarom rendert het venster via een portal op document.body, helemaal los van de kaart.
 */
export function TerugmeldKnop({ opdrachtId, klantNaam }: { opdrachtId: string; klantNaam: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reden, setReden] = useState(TERUGMELD_REDENEN[0].waarde);
  const [toelichting, setToelichting] = useState("");
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  function openModal(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setKlaar(false);
    setFout("");
    setOpen(true);
  }

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
      // Niet stil sluiten: eerst een bevestiging tonen, zodat de monteur weet wat er gebeurde voordat
      // de kaart uit zijn werkpool verdwijnt.
      setKlaar(true);
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  function sluitEnVervers() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="mt-2.5 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 border-2 border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
      >
        <Undo2 size={16} strokeWidth={2.5} aria-hidden="true" />
        Terugmelden
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Klus terugmelden aan kantoor"
            onClick={() => {
              if (!bezig && !klaar) setOpen(false);
            }}
          >
            <div className="w-full max-w-md border-2 border-ink bg-white p-5" onClick={(e) => e.stopPropagation()}>
              {klaar ? (
                <div>
                  <h2 className="flex items-center gap-2 font-mono text-lg font-extrabold text-ink">
                    <CheckCircle2 size={22} strokeWidth={2.5} className="text-success" aria-hidden="true" />
                    Teruggemeld bij kantoor
                  </h2>
                  <p className="mt-2 text-sm text-ink">
                    De klus voor <span className="font-bold">{klantNaam}</span> is teruggemeld; kantoor
                    krijgt bericht en plant hem opnieuw in. Je vindt deze klus terug onder
                    Geschiedenis.
                  </p>
                  <button
                    type="button"
                    onClick={sluitEnVervers}
                    className="mt-4 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent"
                  >
                    Klaar
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-mono text-lg font-extrabold text-ink">Terugmelden aan kantoor</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Klus voor <span className="font-bold">{klantNaam}</span>. Hij verdwijnt uit je
                    werkpool en kantoor krijgt bericht. Je vindt hem terug in je geschiedenis.
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
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
