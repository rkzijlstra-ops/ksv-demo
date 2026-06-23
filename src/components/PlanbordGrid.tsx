"use client";

import Link from "next/link";
import { Package, Wrench, AlertTriangle, MapPin, Minus, Plus } from "lucide-react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Melding, DashboardStatus } from "@/lib/db";
import {
  verdeelLanes,
  nieuweDuurNaResize,
  duurNaStap,
  type PlanbordPlaatsing,
  type MonteurOptie,
} from "@/lib/planbord";
import { duurLabel } from "@/lib/opdracht-weergave";
import { isActief } from "@/lib/opdracht-status";
import { MailMonteurKnop } from "./MailMonteurKnop";

const DOW = ["ma", "di", "wo", "do", "vr", "za", "zo"];

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
function Kaart({
  p,
  dubbel,
  maandag,
  resizeDelta,
  onDuur,
}: {
  p: GeplaatstOpBord;
  dubbel: boolean;
  maandag: string;
  /** Aantal kolommen dat de rechterrand nú versleept is (live), of null als deze kaart niet wordt geresized. */
  resizeDelta: number | null;
  /** Zet een nieuwe duur (werkdagen) voor deze klus; gebruikt door de -/+ knoppen. */
  onDuur: (o: Melding, nieuweDuur: number) => void;
}) {
  const o = p.opdracht;
  // Een opgeleverde klus staat er alleen nog als afgerond overzicht; niet meer verslepen/herplannen.
  const opgeleverd = o.dashboard_status === "opgeleverd";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kaart-${o.id}`,
    data: { soort: "kaart", opdracht: o },
    disabled: opgeleverd,
  });
  // Resize-greep: alleen voor montage (dagblok) die nog niet opgeleverd is. Eigen draggable, zodat het
  // slepen van de rand losstaat van het verslepen van de hele kaart.
  const magResizen = !p.isService && !opgeleverd;
  const {
    setNodeRef: setResizeRef,
    listeners: resizeListeners,
    attributes: resizeAttributes,
  } = useDraggable({
    id: `resize-${o.id}`,
    data: { soort: "resize", opdracht: o, dagIndex: p.dagIndex, span: p.span },
    disabled: !magResizen,
  });
  // Live voorbeeld tijdens het slepen van de rand: balk groeit/krimpt binnen de week (gekapt op vrijdag),
  // en de dagteller telt door ook als de klus in de volgende week doorloopt.
  const aanHetResizen = resizeDelta !== null;
  const effDelta = resizeDelta ?? 0;
  const previewSpan = Math.min(5 - p.dagIndex, Math.max(1, p.span + effDelta));
  const previewDuur = nieuweDuurNaResize(o.duur_dagen, p.span, effDelta);
  const span = aanHetResizen ? previewSpan : p.span;
  // Concept én "gewijzigd na versturen" krijgen oranje (ononderbroken) + envelop; de gele status zelf
  // markeert "nog niet bevestigd", dus geen kartelrand meer.
  // Alleen voor ACTIEVE klussen; een opgeleverde/geannuleerde klus is klaar en houdt z'n eigen
  // omlijsting (opgeleverd = groen), ook al stond de gewijzigd-markering er nog op.
  const nogTeVersturen =
    isActief(o.dashboard_status) && (o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen);
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
  const versturenLabel = !isActief(o.dashboard_status)
    ? null
    : o.dashboard_status === "concept_gepland"
      ? "te versturen"
      : o.gewijzigd_te_versturen
        ? "gewijzigd"
        : null;
  return (
    <Link
      ref={setNodeRef}
      href={`/dashboard/opdracht/${o.id}?from=planbord&week=${maandag}`}
      className={`relative m-1 block min-h-[56px] cursor-grab border-[3px] bg-white px-2 py-1.5 ${randClass} ${
        aanHetResizen ? "overflow-visible ring-2 ring-accent" : "overflow-hidden"
      }`}
      style={{
        gridRow: p.gridRow,
        gridColumn: `${p.dagIndex + 2} / span ${span}`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
        zIndex: isDragging || aanHetResizen ? 10 : 5,
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
          <span
            className={`inline-flex shrink-0 items-center gap-1 ${aanHetResizen ? "font-bold text-accent" : ""}`}
          >
            <Package size={11} strokeWidth={2.2} aria-hidden="true" />
            {magResizen ? (
              // -/+ knoppen: één klik = één werkdag erbij/eraf. Duidelijker dan de rand-sleep,
              // en loopt vanzelf door over het weekend (de balk knipt op vrijdag, de rest volgt week erna).
              <span className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Eén dag korter"
                  disabled={o.duur_dagen <= 1}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDuur(o, duurNaStap(o.duur_dagen, -1));
                  }}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded border border-line text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={11} strokeWidth={2.6} aria-hidden="true" />
                </button>
                <span className="min-w-[3.4em] text-center tabular-nums">
                  {duurLabel(aanHetResizen ? previewDuur : o.duur_dagen)}
                </span>
                <button
                  type="button"
                  aria-label="Eén dag langer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDuur(o, duurNaStap(o.duur_dagen, 1));
                  }}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded border border-line text-ink hover:bg-surface"
                >
                  <Plus size={11} strokeWidth={2.6} aria-hidden="true" />
                </button>
              </span>
            ) : (
              duurLabel(aanHetResizen ? previewDuur : o.duur_dagen)
            )}
          </span>
        )}
        {o.referentienummer ? (
          <span className="shrink-0 font-mono font-bold text-primary">{o.referentienummer}</span>
        ) : (
          <span className="shrink-0 font-bold text-urgent-rood">geen ref</span>
        )}
        {versturenLabel && <span className="shrink-0 font-bold text-accent">{versturenLabel}</span>}
        {teruggemeld && <span className="shrink-0 font-bold text-ink">teruggemeld</span>}
        {o.heropend_at && <span className="shrink-0 font-bold text-accent">heropend</span>}
        {opgeleverd && <span className="shrink-0 font-bold text-success">opgeleverd</span>}
        {dubbel && (
          <span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-urgent-rood">
            <AlertTriangle size={11} strokeWidth={2.5} aria-hidden="true" /> dubbel
          </span>
        )}
      </span>

      {/* Resize-greep aan de rechterrand (alleen montage). Eigen pointerdown die niet naar de kaart
          bubbelt, zodat het slepen van de rand niet het verslepen van de hele kaart start; en een klik
          op de greep navigeert niet naar de detailpagina. */}
      {magResizen && (
        <span
          ref={setResizeRef}
          data-testid={`resize-${o.id}`}
          aria-label="Sleep om het aantal dagen te wijzigen"
          title="Sleep naar rechts voor meer dagen, naar links voor minder"
          className="absolute bottom-0 right-0 top-1/3 z-20 flex w-3.5 cursor-ew-resize touch-none items-center justify-center"
          onPointerDown={(e) => {
            e.stopPropagation();
            resizeListeners?.onPointerDown?.(e);
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          {...resizeAttributes}
        >
          <span
            className={`h-6 w-1 rounded-full ${aanHetResizen ? "bg-accent" : "bg-ink-muted/50"}`}
            aria-hidden="true"
          />
        </span>
      )}
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
  // Weekendkolommen (za=5, zo=6) krijgen een lichte tint zodat ze visueel los staan van de werkweek.
  const weekend = col >= 5;
  return (
    <div
      ref={setNodeRef}
      data-testid={`cel-${toegewezenAan}-${dag}`}
      className={`min-h-[64px] border-r border-line last:border-r-0 ${
        laatsteLane ? "border-b-4 border-b-line" : "border-b border-b-line"
      } ${isOver ? "bg-accent/10 outline-2 -outline-offset-2 outline-accent" : weekend ? "bg-surface/40" : ""}`}
      style={{ gridRow, gridColumn: col + 2 }}
    />
  );
}

export function PlanbordGrid({
  weekdagen,
  monteurs,
  plaatsingen,
  conflicten,
  onDuur,
  resize,
}: {
  weekdagen: string[];
  monteurs: MonteurOptie[];
  plaatsingen: PlanbordPlaatsing<Melding>[];
  /** Ids van dubbel geboekte opdrachten (rode waarschuwing op de kaart). */
  conflicten: Set<string>;
  /** Zet een nieuwe duur (werkdagen) voor een klus; gebruikt door de -/+ knoppen op een montage. */
  onDuur: (o: Melding, nieuweDuur: number) => void;
  /** De kaart waarvan de rand nú versleept wordt, met het aantal kolommen (live), of null. */
  resize: { id: string; deltaKolommen: number } | null;
}) {
  if (monteurs.length === 0) {
    return (
      <p className="mt-4 border-2 border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">
        Nog geen monteurs. Voeg eerst monteurs toe via het scherm Gebruikers (menu rechtsboven);
        dan verschijnen ze hier als rij en kun je klussen naar een dag slepen.
      </p>
    );
  }

  // Per monteur-account de lanes berekenen; daarna de startrijen als zuivere prefix-som (rij 1 = kop).
  // Koppelen op ACCOUNT-ID (toegewezen_aan), niet op naam: een naam-mismatch (bv. na hernoemen) mag
  // een klus nooit buiten alle rijen laten vallen en zo onzichtbaar maken.
  const perMonteur = monteurs.map((a) => {
    const eigen = plaatsingen.filter((p) => p.opdracht.toegewezen_aan === a.id);
    const kaarten = verdeelLanes(eigen);
    const laneCount = Math.max(1, ...kaarten.map((k) => k.lane + 1));
    return { account: a, kaarten, laneCount };
  });
  const rijen = perMonteur.map((mb, i) => {
    const startRow = 2 + perMonteur.slice(0, i).reduce((s, x) => s + x.laneCount, 0);
    const geplaatst: GeplaatstOpBord[] = mb.kaarten.map((k) => ({
      ...k.plaatsing,
      gridRow: startRow + k.lane,
    }));
    return { account: mb.account, startRow, laneCount: mb.laneCount, geplaatst };
  });

  return (
    <div
      className="mt-3 grid border-2 border-ink bg-white"
      style={{
        gridTemplateColumns: `104px repeat(${weekdagen.length}, minmax(0, 1fr))`,
        // Kop-rij op natuurlijke hoogte (auto); alle monteur-rijen een VASTE hoogte, zodat een blok van
        // 1 dag en een blok van meerdere dagen even hoog zijn (geen verspringende, plattere balken meer).
        // 98px = de natuurlijke hoogte van een volle 1-daagse kaart (gemeten: ~89px inhoud + 8px marge),
        // zodat niets afkapt en een meerdaagse balk meegroeit i.p.v. platter te worden.
        gridTemplateRows: "auto",
        gridAutoRows: "98px",
      }}
    >
      {/* Kop */}
      <div className="border-b-2 border-r border-ink bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />
      {weekdagen.map((d, i) => (
        <div
          key={d}
          className={`border-b-2 border-r border-ink px-2.5 py-2 last:border-r-0 ${
            i >= 5 ? "bg-surface/60" : "bg-surface"
          }`}
          style={{ gridRow: 1, gridColumn: i + 2 }}
        >
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{DOW[i]}</div>
          <div className="text-base font-extrabold">{dagLabel(d)}</div>
        </div>
      ))}

      {rijen.map(({ account, startRow, laneCount, geplaatst }) => (
        <div key={`blok-${account.id}`} className="contents">
          {/* Monteur-label, overspant alle lanes van deze monteur */}
          <div
            className="flex items-center gap-2 border-b-4 border-b-line border-r border-r-line bg-surface px-2.5 py-2 font-extrabold"
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
            <Kaart
              key={p.opdracht.id}
              p={p}
              dubbel={conflicten.has(p.opdracht.id)}
              maandag={weekdagen[0]}
              resizeDelta={resize?.id === p.opdracht.id ? resize.deltaKolommen : null}
              onDuur={onDuur}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
