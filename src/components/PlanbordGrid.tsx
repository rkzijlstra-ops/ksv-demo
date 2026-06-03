"use client";

import Link from "next/link";
import { Package, Wrench } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Melding, DashboardStatus } from "@/lib/db";
import { verdeelLanes, type PlanbordPlaatsing } from "@/lib/planbord";
import { duurLabel } from "@/lib/opdracht-weergave";
import { MailMonteurKnop } from "./MailMonteurKnop";

const DOW = ["ma", "di", "wo", "do", "vr"];

/** Solide kleurbalk links per status (altijd doorgetrokken). */
const BALK: Record<DashboardStatus, string> = {
  binnen: "bg-ink-muted",
  concept_gepland: "bg-accent",
  gepland: "bg-accent",
  bevestigd: "bg-bevestigd",
  opgeleverd: "bg-success",
  geannuleerd: "bg-line",
};

/** Dunne buitenrand per status; gestreept = nog te versturen (concept). */
const RAND: Record<DashboardStatus, string> = {
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

/** Plaatsing met de berekende grid-rij erbij (lane binnen de monteur-rij). */
type GeplaatstOpBord = PlanbordPlaatsing<Melding> & { gridRow: number };

/** Uniforme, sleepbare kaart/balk; montage rekt uit over meerdere dagen, service is één dag. */
function Kaart({ p }: { p: GeplaatstOpBord }) {
  const o = p.opdracht;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kaart-${o.id}`,
    data: { soort: "kaart", opdracht: o },
  });
  // Concept én "gewijzigd na versturen" krijgen dezelfde oranje-gestreepte behandeling + envelop.
  const nogTeVersturen = o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen;
  const randClass = nogTeVersturen ? "border-accent border-dashed" : RAND[o.dashboard_status];
  const balkClass = nogTeVersturen ? "bg-accent" : BALK[o.dashboard_status];
  const versturenLabel =
    o.dashboard_status === "concept_gepland" ? "te versturen" : o.gewijzigd_te_versturen ? "gewijzigd" : null;
  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/opdracht/${o.id}`}
      className={`m-1 grid min-h-[56px] cursor-grab grid-cols-[5px_1fr] overflow-hidden border-[1.5px] bg-white ${randClass}`}
      style={{
        gridRow: p.gridRow,
        gridColumn: `${p.dagIndex + 2} / span ${p.span}`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
        zIndex: isDragging ? 10 : 5,
      }}
      {...listeners}
      {...attributes}
    >
      <span aria-hidden className={balkClass} />
      <span className="min-w-0 px-2 py-1.5">
      <span className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-baseline gap-1.5">
          {p.isService && (
            <span className="font-mono text-[12px] font-extrabold text-primary">
              {(o.starttijd ?? "").slice(0, 5)}
            </span>
          )}
          <span className="truncate text-[12.5px] font-extrabold">
            {o.klant_naam ?? "Onbekende klant"}
          </span>
        </span>
        {nogTeVersturen && <MailMonteurKnop opdrachtId={o.id} />}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-ink-muted">
        {p.isService ? (
          <Wrench size={11} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1">
            <Package size={11} strokeWidth={2.2} aria-hidden="true" />
            {duurLabel(o.duur_dagen)}
          </span>
        )}
        {o.referentienummer ? (
          <span className="shrink-0 font-mono font-bold text-primary">{o.referentienummer}</span>
        ) : (
          <span className="shrink-0 font-bold text-urgent-rood">geen ref</span>
        )}
        {versturenLabel && <span className="shrink-0 font-bold text-accent">{versturenLabel}</span>}
      </span>
      </span>
    </Link>
  );
}

/** Lege cel = drop-doel (monteur + dag). */
function DropCel({
  monteur,
  dag,
  gridRow,
  col,
  laatsteLane,
}: {
  monteur: string;
  dag: string;
  gridRow: number;
  col: number;
  laatsteLane: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cel-${monteur}-${dag}`,
    data: { monteur, dag },
  });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[64px] border-r border-line last:border-r-0 ${
        laatsteLane ? "border-b-2 border-b-ink" : "border-b border-b-line"
      } ${isOver ? "bg-accent/10 outline-2 -outline-offset-2 outline-accent" : ""}`}
      style={{ gridRow, gridColumn: col + 2 }}
    />
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

  // Per monteur de lanes berekenen; daarna de startrijen als zuivere prefix-som (rij 1 = kop).
  const perMonteur = monteurs.map((m) => {
    const eigen = plaatsingen.filter((p) => p.opdracht.monteur_naam === m);
    const kaarten = verdeelLanes(eigen);
    const laneCount = Math.max(1, ...kaarten.map((k) => k.lane + 1));
    return { m, kaarten, laneCount };
  });
  const rijen = perMonteur.map((mb, i) => {
    const startRow = 2 + perMonteur.slice(0, i).reduce((s, x) => s + x.laneCount, 0);
    const geplaatst: GeplaatstOpBord[] = mb.kaarten.map((k) => ({
      ...k.plaatsing,
      gridRow: startRow + k.lane,
    }));
    return { m: mb.m, startRow, laneCount: mb.laneCount, geplaatst };
  });

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

      {rijen.map(({ m, startRow, laneCount, geplaatst }) => (
        <div key={`blok-${m}`} className="contents">
          {/* Monteur-label, overspant alle lanes van deze monteur */}
          <div
            className="flex items-center gap-2 border-b-2 border-b-ink border-r border-r-line px-2.5 py-2 font-extrabold"
            style={{ gridRow: `${startRow} / span ${laneCount}`, gridColumn: 1 }}
          >
            {m}
          </div>

          {/* Droppable cellen per lane en dag */}
          {Array.from({ length: laneCount }).map((_, lane) =>
            weekdagen.map((d, c) => (
              <DropCel
                key={`cel-${m}-${lane}-${c}`}
                monteur={m}
                dag={d}
                gridRow={startRow + lane}
                col={c}
                laatsteLane={lane === laneCount - 1}
              />
            )),
          )}

          {/* Kaarten/balken bovenop de cellen */}
          {geplaatst.map((p) => (
            <Kaart key={p.opdracht.id} p={p} />
          ))}
        </div>
      ))}
    </div>
  );
}
