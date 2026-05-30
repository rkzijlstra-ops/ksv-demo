"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { haalQueueVoorOpdracht } from "@/lib/queue";
import { abonneerOpQueue } from "@/lib/sync-state";
import type { QueueMelding } from "@/lib/queue-db";

/**
 * Toont meldingen uit de IndexedDB-wachtrij die nog niet verstuurd zijn voor
 * deze opdracht. Verdwijnen automatisch zodra de sync ze succesvol heeft
 * geupload (queue-event triggert refresh).
 */
export function PendingMeldingen({ opdrachtId }: { opdrachtId: string }) {
  const [items, setItems] = useState<QueueMelding[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function laad() {
      const lijst = await haalQueueVoorOpdracht(opdrachtId).catch(
        () => [] as QueueMelding[],
      );
      if (!cancelled) setItems(lijst);
    }
    void laad();
    const off = abonneerOpQueue(() => {
      void laad();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [opdrachtId]);

  if (items.length === 0) return null;

  return (
    <ul className="mb-3 flex flex-col gap-2">
      {items.map((m) => {
        const mislukt = m.status === "mislukt";
        const fotosTotaal = m.foto_urls.length + m.foto_local_ids.length;
        return (
          <li
            key={m.id}
            className={`rounded-none border-2 border-dashed p-3 ${
              mislukt
                ? "border-urgent-rood bg-urgent-rood/5"
                : "border-accent bg-accent/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider ${
                  mislukt ? "text-urgent-rood" : "text-accent"
                }`}
              >
                {mislukt ? (
                  <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <Clock size={14} strokeWidth={2.5} aria-hidden="true" />
                )}
                {mislukt ? "Versturen mislukt" : "Wacht op netwerk"}
              </span>
              {m.spoed && (
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-urgent-rood">
                  <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" />
                  Spoed
                </span>
              )}
            </div>
            {m.ruwe_tekst && (
              <p className="mt-2 text-base text-ink">{m.ruwe_tekst}</p>
            )}
            {fotosTotaal > 0 && (
              <p className="mt-1 text-xs text-ink-muted">
                {fotosTotaal} {fotosTotaal === 1 ? "foto" : "foto's"}
              </p>
            )}
            {m.laatste_fout && (
              <p className="mt-1 text-xs text-urgent-rood">Fout: {m.laatste_fout}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
