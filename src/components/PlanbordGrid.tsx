"use client";

import Link from "next/link";
import { Package, Wrench } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Melding, DashboardStatus } from "@/lib/db";
import type { PlanbordPlaatsing } from "@/lib/planbord";
import { duurLabel } from "@/lib/opdracht-weergave";

const DOW = ["ma", "di", "wo", "do", "vr"];

/** Rand-class per status (gestreept = nog te versturen). Eén kleur per status. */
const KAART: Record<DashboardStatus, string> = {
  binnen: "border-ink-muted",
  concept_gepland: "border-accent border-dashed",
  gepland: "border-accent",
  bevestigd: "border-bevestigd",
  opgeleverd: "border-success",
  geannuleerd: "border-line",
};

function dagLabel(iso: string): string {
  return String(parseInt(iso.split("-")[2], 10));
}

/** Uniforme, sleepbare kaart op het bord; klikken navigeert (sleepdrempel). */
function Kaart({ p }: { p: PlanbordPlaatsing<Melding> }) {
  const o = p.opdracht;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kaart-${o.id}`,
    data: { soort: "kaart", opdracht: o },
  });
  return (
    <Link
      ref={setNodeRef}
      href={`/opdracht/${o.id}`}
      className={`block min-h-[54px] cursor-grab border-[1.5px] border-l-[5px] bg-white px-2 py-1.5 ${KAART[o.dashboard_status]}`}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
        zIndex: isDragging ? 10 : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <span className="flex items-baseline gap-1.5">
        {p.isService && (
          <span className="font-mono text-[12px] font-extrabold text-primary">
            {(o.starttijd ?? "").slice(0, 5)}
          </span>
        )}
        <span className="truncate text-[12.5px] font-extrabold">
          {o.klant_naam ?? "Onbekende klant"}
        </span>
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-muted">
        {p.isService ? (
          <Wrench size={11} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <span className="inline-flex items-center gap-1">
            <Package size={11} strokeWidth={2.2} aria-hidden="true" />
            {duurLabel(o.duur_dagen)}
          </span>
        )}
        {o.referentienummer ? (
          <span className="font-mono font-bold text-primary">{o.referentienummer}</span>
        ) : (
          <span className="font-bold text-urgent-rood">geen ref</span>
        )}
        {o.dashboard_status === "concept_gepland" && (
          <span className="font-bold text-accent">te versturen</span>
        )}
      </span>
    </Link>
  );
}

/** Lege/gevulde cel = drop-doel voor een opdracht (monteur + dag), kaarten gestapeld. */
function DropCel({
  monteur,
  dag,
  r,
  c,
  kaarten,
}: {
  monteur: string;
  dag: string;
  r: number;
  c: number;
  kaarten: PlanbordPlaatsing<Melding>[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cel-${r}-${c}`, data: { monteur, dag } });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[96px] flex-col gap-1.5 border-b border-r border-line p-1 last:border-r-0 ${
        isOver ? "bg-accent/10 outline-2 -outline-offset-2 outline-accent" : ""
      }`}
      style={{ gridRow: r + 2, gridColumn: c + 2 }}
    >
      {kaarten.map((p) => (
        <Kaart key={p.opdracht.id} p={p} />
      ))}
    </div>
  );
}

export function PlanbordGrid({
  weekdagen,
  monteurs,
  plaatsingen,
}: {
  weekdagen: string[];
  monteurs: string[];
  plaatsingen: PlanbordPlaatsing<Melding>[];
}) {
  if (monteurs.length === 0) {
    return (
      <p className="mt-4 border-2 border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">
        Nog niets ingepland deze week. Plan hieronder een opdracht in via Inplannen (typ daar de
        monteur), dan verschijnt de monteur hier als rij en kun je daarna opdrachten naar een dag
        slepen.
      </p>
    );
  }

  // Kaarten per cel (monteur-rij + dag-kolom), gesorteerd: dagblokken eerst, dan op tijd.
  const perCel = new Map<string, PlanbordPlaatsing<Melding>[]>();
  for (const p of plaatsingen) {
    const r = monteurs.indexOf(p.opdracht.monteur_naam ?? "");
    if (r === -1) continue;
    const key = `${r}-${p.dagIndex}`;
    (perCel.get(key) ?? perCel.set(key, []).get(key)!).push(p);
  }
  for (const lijst of perCel.values()) {
    lijst.sort((a, b) => (a.opdracht.starttijd ?? "").localeCompare(b.opdracht.starttijd ?? ""));
  }

  return (
    <div
      className="mt-3 grid border-2 border-ink bg-white"
      style={{ gridTemplateColumns: "104px repeat(5, minmax(0, 1fr))" }}
    >
      {/* Kop */}
      <div className="border-b-2 border-r border-ink bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />
      {weekdagen.map((d, i) => (
        <div
          key={d}
          className="border-b-2 border-r border-ink bg-surface px-2.5 py-2 last:border-r-0"
          style={{ gridRow: 1, gridColumn: i + 2 }}
        >
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{DOW[i]}</div>
          <div className="text-base font-extrabold">{dagLabel(d)}</div>
        </div>
      ))}

      {/* Monteur-labels */}
      {monteurs.map((m, r) => (
        <div
          key={`label-${m}`}
          className="flex items-center gap-2 border-b border-r border-line px-2.5 py-2 font-extrabold"
          style={{ gridRow: r + 2, gridColumn: 1 }}
        >
          {m}
        </div>
      ))}

      {/* Droppable cellen met gestapelde kaarten */}
      {monteurs.map((m, r) =>
        weekdagen.map((d, c) => (
          <DropCel
            key={`cel-${r}-${c}`}
            monteur={m}
            dag={d}
            r={r}
            c={c}
            kaarten={perCel.get(`${r}-${c}`) ?? []}
          />
        )),
      )}
    </div>
  );
}
