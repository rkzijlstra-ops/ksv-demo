"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, GripVertical, CalendarPlus, AlertCircle } from "lucide-react";
import type { Melding } from "@/lib/db";
import type { MonteurOptie } from "@/lib/planbord";
import { tijdOpties } from "@/lib/tijd";
import { redenLabel } from "@/lib/terugmeld-mail";
import { DocumenttypeBadge } from "./DocumenttypeBadge";

export function PlanbordPool({
  pool,
  monteurs,
  standaardDatum,
}: {
  pool: Melding[];
  monteurs: MonteurOptie[];
  standaardDatum: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { setNodeRef, isOver } = useDroppable({ id: "pool", data: { zone: "pool" } });

  return (
    <div className="mt-5 border-2 border-ink bg-white">
      <div className="flex items-center gap-2.5 border-b-2 border-ink bg-surface px-3.5 py-3">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.14em]">Nog te plannen</span>
        <span className="text-xs text-ink-muted">{pool.length}</span>
        <span className="ml-auto text-[11.5px] text-ink-muted">
          Sleep een afspraak hierheen om hem terug te halen
        </span>
      </div>
      <div ref={setNodeRef} data-testid="pool-zone" className={isOver ? "bg-accent/10 outline-2 -outline-offset-2 outline-accent" : ""}>
      {pool.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">
          Niets meer te plannen. Sleep een afspraak van het bord hierheen om hem terug te halen.
        </p>
      ) : (
        <div className="flex flex-col gap-3 p-3.5">
          {pool.map((o) => (
            <div key={o.id} className="border-2 border-ink-muted bg-white">
              <div className="flex items-start gap-1 p-3">
                <SleepGreep opdracht={o} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold">{o.klant_naam ?? "Onbekende klant"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <DocumenttypeBadge type={o.documenttype} />
                    {o.teruggemeld_at && (
                      <span className="inline-flex items-center border-[1.5px] border-ink bg-ink px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-white">
                        Teruggemeld
                      </span>
                    )}
                    {o.heropend_at && (
                      <span className="inline-flex items-center border-[1.5px] border-accent bg-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-white">
                        Heropend
                      </span>
                    )}
                    {o.referentienummer ? (
                      <span className="bg-surface px-1.5 py-0.5 font-mono text-xs font-bold">
                        {o.referentienummer}
                      </span>
                    ) : (
                      <span className="font-bold text-urgent-rood text-xs">geen ref</span>
                    )}
                    {o.klant_adres && <span className="text-xs text-ink-muted">{o.klant_adres}</span>}
                  </div>
                  {o.teruggemeld_at && o.teruggemeld_reden && (
                    <p className="mt-1 text-xs text-ink">
                      Reden: <span className="font-semibold">{redenLabel(o.teruggemeld_reden)}</span>
                      {o.teruggemeld_toelichting ? ` — ${o.teruggemeld_toelichting}` : ""}
                    </p>
                  )}
                  {o.heropend_at && o.werkomschrijving && (
                    <p className="mt-1 text-xs text-ink">
                      Instructie: <span className="font-semibold">{o.werkomschrijving}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  className="shrink-0 cursor-pointer border-2 border-ink bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.04em] hover:bg-surface"
                >
                  Inplannen
                </button>
              </div>
              {openId === o.id && (
                <InplanFormulier
                  opdrachtId={o.id}
                  monteurs={monteurs}
                  standaardDatum={standaardDatum}
                  onKlaar={() => setOpenId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

/** Sleepgreep van een pool-opdracht; sleep naar een cel op het planbord om in te plannen. */
function SleepGreep({ opdracht }: { opdracht: Melding }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${opdracht.id}`,
    data: { soort: "pool", opdracht },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label="Sleep naar het planbord"
      className="mt-0.5 shrink-0 cursor-grab touch-none text-ink-muted"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={18} aria-hidden="true" />
    </button>
  );
}

function InplanFormulier({
  opdrachtId,
  monteurs,
  standaardDatum,
  onKlaar,
}: {
  opdrachtId: string;
  monteurs: MonteurOptie[];
  standaardDatum: string;
  onKlaar: () => void;
}) {
  const router = useRouter();
  const tijdenId = useId();
  const [monteurId, setMonteurId] = useState(monteurs[0]?.id ?? "");
  const [datum, setDatum] = useState(standaardDatum);
  const [dagen, setDagen] = useState(1);
  const [tijd, setTijd] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan() {
    const gekozen = monteurs.find((m) => m.id === monteurId);
    if (!gekozen) {
      setFout("Kies een monteur");
      return;
    }
    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/plannen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toegewezen_aan: gekozen.id,
          monteur_naam: gekozen.naam,
          startdatum: datum,
          duur_dagen: dagen,
          starttijd: tijd.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFout(body.error ?? "Inplannen mislukt");
        return;
      }
      onKlaar();
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const veld = "min-h-[44px] border-[1.5px] border-ink bg-white px-3 text-sm";

  return (
    <div className="border-t-2 border-line bg-surface p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-[2_1_180px] flex-col gap-1 text-[11.5px] font-bold uppercase tracking-[0.04em] text-ink-muted">
          Monteur
          <select value={monteurId} onChange={(e) => setMonteurId(e.target.value)} className={veld}>
            {monteurs.length === 0 && <option value="">Geen monteurs</option>}
            {monteurs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.naam}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[11.5px] font-bold uppercase tracking-[0.04em] text-ink-muted">
          Startdatum
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={veld} />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-bold uppercase tracking-[0.04em] text-ink-muted">
          Dagen
          <input
            type="number"
            min={1}
            value={dagen}
            onChange={(e) => setDagen(Math.max(1, Number(e.target.value) || 1))}
            className={`${veld} w-20`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-bold uppercase tracking-[0.04em] text-ink-muted">
          Tijd (optioneel)
          <input
            type="text"
            inputMode="numeric"
            list={tijdenId}
            value={tijd}
            onChange={(e) => setTijd(e.target.value)}
            placeholder="bijv. 09:30"
            pattern="\d{1,2}:\d{2}"
            className={`${veld} w-28`}
          />
          <datalist id={tijdenId}>
            {tijdOpties().map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>
      <p className="mt-2 text-[12px] text-ink-muted">
        Kies een tijd uit de lijst (per 5 min) of typ er zelf een. Tijd leeg = hele dag (montage), een
        tijd invullen = kaartje op dat uur (service).
      </p>
      {fout && (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} aria-hidden="true" />
          {fout}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onKlaar}
          disabled={bezig}
          className="cursor-pointer border-[1.5px] border-line bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.03em] text-ink-muted"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="inline-flex cursor-pointer items-center gap-2 border-2 border-primary bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-[0.03em] text-white disabled:opacity-60"
        >
          {bezig ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <CalendarPlus size={15} strokeWidth={2.5} aria-hidden="true" />
          )}
          Op planbord zetten
        </button>
      </div>
    </div>
  );
}
