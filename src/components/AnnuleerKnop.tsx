"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, AlertCircle } from "lucide-react";

/**
 * Laat kantoor een opdracht annuleren (status -> geannuleerd). Twee-staps bevestiging tegen
 * per-ongeluk. Was de klus al naar de monteur verstuurd, dan stuurt de route hem automatisch bericht.
 * Niet zichtbaar bij een al opgeleverde of al geannuleerde opdracht.
 */
export function AnnuleerKnop({
  opdrachtId,
  status,
  opgeleverd,
}: {
  opdrachtId: string;
  status: string;
  opgeleverd: boolean;
}) {
  const router = useRouter();
  const [bevestig, setBevestig] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  if (status === "geannuleerd") {
    return (
      <div className="mt-3 flex items-center gap-2 border border-line bg-surface p-3 text-sm font-semibold text-ink-muted">
        <Ban size={16} aria-hidden="true" />
        Deze klus is geannuleerd
      </div>
    );
  }
  if (opgeleverd) return null;

  async function annuleer() {
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/annuleren`, { method: "POST" });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(b.error ?? `Annuleren mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mt-3">
      {!bevestig ? (
        <button
          type="button"
          onClick={() => setBevestig(true)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 border-2 border-urgent-rood px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Ban size={16} strokeWidth={2.5} aria-hidden="true" />
          Klus annuleren
        </button>
      ) : (
        <div className="flex flex-col gap-2 border-2 border-urgent-rood bg-urgent-rood/5 p-3">
          <p className="text-sm font-semibold text-ink">
            Zeker weten? De toegewezen monteur krijgt automatisch bericht.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={annuleer}
              disabled={bezig}
              className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-urgent-rood px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
            >
              {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Ja, annuleren
            </button>
            <button
              type="button"
              onClick={() => setBevestig(false)}
              disabled={bezig}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
            >
              Nee
            </button>
          </div>
        </div>
      )}
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
