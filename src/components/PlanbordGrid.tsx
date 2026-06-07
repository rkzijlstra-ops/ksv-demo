"use client";

import Link from "next/link";
import { Package, Wrench, AlertTriangle, MapPin } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Melding, DashboardStatus } from "@/lib/db";
import { verdeelLanes, type PlanbordPlaatsing, type MonteurOptie } from "@/lib/planbord";
import { duurLabel } from "@/lib/opdracht-weergave";
import { MailMonteurKnop } from "./MailMonteurKnop";

const DOW = ["ma", "di", "wo", "do", "vr"];

/** Dikke gekleurde omlijsting per status, rondom de hele kaart (ononderbroken, geen kartelrand meer). */
const RAND: Record<DashboardStatus, string> = {
  binnen: "border-ink-muted",
  concept_gepland: "border-accent",
  gepland: "border-urgent-geel",
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
function Kaart({ p, dubbel, maandag }: { p: GeplaatstOpBord; dubbel: boolean; maandag: string }) {
  const o = p.opdracht;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kaart-${o.id}`,
    data: { soort: "kaart", opdracht: o },
  });
  // Concept én "gewijzigd na versturen" krijgen oranje (ononderbroken) + envelop; de gele status zelf
  // markeert "nog niet bevestigd", dus geen kartelrand meer.
  const nogTeVersturen = o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen;
  // Teruggemeld door de monteur: kantoor moet hier iets mee (herplannen/bellen/afsluiten).
  const teruggemeld = !!o.teruggemeld_at;
  // Dikke gekleurde omlijsting rondom; een dubbele boeking krijgt voorrang met rood.
  const randClass = dubbel
    ? "border-urgent-rood"
    : teruggemeld
      ? "border-ink"
      : nogTeVersturen
        ? "border-accent"
        : RAND[o.dashboard_status];
  const versturenLabel =
    o.dashboard_status === "concept_gepland" ? "te versturen" : o.gewijzigd_te_versturen ? "gewijzigd" : null;
  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/opdracht/${o.id}?from=planbord&week=${maandag}`}
      className={`m-1 block min-h-[56px] cursor-grab overflow-hidden border-[3px] bg-white px-2 py-1.5 ${randClass}`}
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
      {o.klant_adres && (
        <span className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-ink-muted">
          <MapPin size={10} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{o.klant_adres}</span>
        </span>
      )}
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
        {teruggemeld && <span className="shrink-0 font-bold text-ink">teruggemeld</span>}
        {dubbel && (
          <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-urgent-rood">
            <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" /> dubbel
          </span>
        )}
      </span>
    </Link>
  );
}

/** Lege cel = drop-doel (monteur-account + dag + lane). Lane zit in de ID om duplicaten te voorkomen. */
function DropCel({
  toegewezenAan,
  monteurNaam,
  dag,
  lane,
  gridRow,
  col,
  laatsteLane,
}: {
  toegewezenAan: string;
  monteurNaam: string;
  dag: string;
  lane: number;
  gridRow: number;
  col: number;
  laatsteLane: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cel-${toegewezenAan}-${dag}-${lane}`,
    data: { toegewezen_aan: toegewezenAan, monteur_naam: monteurNaam, dag },
  });
  return (
    <div
      ref={setNodeRef}
      data-testid={`cel-${toegewezenAan}-${dag}`}
      className={`min-h-[64px] border-r border-line last:border-r-0 ${
        laatsteLane ? "border-b-4 border-b-ink" : "border-b border-b-line"
      } ${isOver ? "bg-accent/10 outline-2 -outline-offset-2 outline-accent" : ""}`}
      style={{ gridRow, gridColumn: col + 2 }}
    />
  );
}

export function PlanbordGrid({
  weekdagen,
  monteurs,
  plaatsingen,
  conflicten,
}: {
  weekdagen: string[];
  monteurs: MonteurOptie[];
  plaatsingen: PlanbordPlaatsing<Melding>[];
  /** Ids van dubbel geboekte opdrachten (rode waarschuwing op de kaart). */
  conflicten: Set<string>;
}) {
  if (monteurs.length === 0) {
    return (
      <p className="mt-4 border-2 border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">
        Nog geen monteurs. Voeg eerst monteurs toe via het scherm Gebruikers (menu rechtsboven);
        dan verschijnen ze hier als rij en kun je opdrachten naar een dag slepen.
      </p>
    );
  }

  // Per monteur-account de lanes berekenen; daarna de startrijen als zuivere prefix-som (rij 1 = kop).
  const perMonteur = monteurs.map((a) => {
    const eigen = plaatsingen.filter((p) => p.opdracht.monteur_naam === a.naam);
    const kaarten = verdeelLanes(eigen);
    const laneCount = Math.max(1, ...kaarten.map((k) => k.lane + 1));
    return { account: a, kaarten, laneCount };
  });
  // Eén spacer-rij na elke monteur (behalve de laatste) geeft wat witruimte tussen de blokken; vandaar
  // +1 per voorgaande monteur in de prefix-som.
  const rijen = perMonteur.map((mb, i) => {
    const startRow = 2 + perMonteur.slice(0, i).reduce((s, x) => s + x.laneCount + 1, 0);
    const geplaatst: GeplaatstOpBord[] = mb.kaarten.map((k) => ({
      ...k.plaatsing,
      gridRow: startRow + k.lane,
    }));
    const spacerRow = i < perMonteur.length - 1 ? startRow + mb.laneCount : null;
    return { account: mb.account, startRow, laneCount: mb.laneCount, geplaatst, spacerRow };
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

      {rijen.map(({ account, startRow, laneCount, geplaatst, spacerRow }) => (
        <div key={`blok-${account.id}`} className="contents">
          {/* Monteur-label, overspant alle lanes van deze monteur */}
          <div
            className="flex items-center gap-2 border-b-4 border-b-ink border-r border-r-line bg-surface px-2.5 py-2 font-extrabold"
            style={{ gridRow: `${startRow} / span ${laneCount}`, gridColumn: 1 }}
          >
            {account.naam}
          </div>

          {/* Droppable cellen per lane en dag */}
          {Array.from({ length: laneCount }).map((_, lane) =>
            weekdagen.map((d, c) => (
              <DropCel
                key={`cel-${account.id}-${lane}-${c}`}
                toegewezenAan={account.id}
                monteurNaam={account.naam}
                dag={d}
                lane={lane}
                gridRow={startRow + lane}
                col={c}
                laatsteLane={lane === laneCount - 1}
              />
            )),
          )}

          {/* Kaarten/balken bovenop de cellen */}
          {geplaatst.map((p) => (
            <Kaart key={p.opdracht.id} p={p} dubbel={conflicten.has(p.opdracht.id)} maandag={weekdagen[0]} />
          ))}

          {/* Witruimte tussen monteur-blokken */}
          {spacerRow !== null && (
            <div
              aria-hidden
              className="min-h-[14px] bg-surface"
              style={{ gridRow: spacerRow, gridColumn: "1 / -1" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
