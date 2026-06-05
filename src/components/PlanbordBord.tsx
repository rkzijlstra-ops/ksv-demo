"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Melding } from "@/lib/db";
import {
  maandagVan,
  weekDagen,
  weeknummer,
  verschuifDagen,
  plaatsOpdrachten,
  type MonteurOptie,
} from "@/lib/planbord";
import { moetOpnieuwVersturen, opVerzondenPlek } from "@/lib/opdracht-status";
import { formatDatumKort } from "@/lib/datum";
import { PlanbordGrid } from "./PlanbordGrid";
import { PlanbordPool } from "./PlanbordPool";
import { VerstuurKnop } from "./VerstuurKnop";

interface SleepData {
  soort: "pool" | "kaart";
  opdracht: Melding;
}

/** Smalle drop-strook naast het raster: sleep een afspraak hierheen om een week te schuiven. */
function RandZone({ zone, kant }: { zone: string; kant: "links" | "rechts" }) {
  const { setNodeRef, isOver } = useDroppable({ id: zone, data: { zone } });
  return (
    <div
      ref={setNodeRef}
      title={kant === "links" ? "Vorige week" : "Volgende week"}
      className={`mt-3 flex w-7 shrink-0 items-center justify-center border-2 ${
        isOver ? "border-accent bg-accent/15 text-accent" : "border-dashed border-line text-ink-muted"
      }`}
    >
      {kant === "links" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </div>
  );
}

/**
 * Interactieve planbord-laag. Houdt zowel de getoonde week als een eigen kopie van de opdrachten
 * in client-state, zodat weeknavigatie direct is (alle actieve opdrachten zitten al in de data) en
 * een sleep-actie de kaart meteen verplaatst (optimistisch). Slepen naar de rand schuift een week.
 */
export function PlanbordBord({
  opdrachten,
  monteurs,
  ankerInit,
  vandaag,
}: {
  opdrachten: Melding[];
  monteurs: MonteurOptie[];
  ankerInit: string;
  vandaag: string;
}) {
  const router = useRouter();
  const [weekAnker, setWeekAnker] = useState(ankerInit);
  const [items, setItems] = useState<Melding[]>(opdrachten);
  const [vorigeProp, setVorigeProp] = useState(opdrachten);
  const [actief, setActief] = useState<Melding | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Na een server-refresh de lokale kopie weer gelijktrekken (render-patroon, geen useEffect).
  if (opdrachten !== vorigeProp) {
    setVorigeProp(opdrachten);
    setItems(opdrachten);
  }

  const maandag = maandagVan(weekAnker);
  const dagen = weekDagen(maandag);
  const weeknr = weeknummer(maandag);
  const plaatsingen = plaatsOpdrachten(items, dagen);
  const pool = items.filter((o) => o.dashboard_status === "binnen");
  const teVersturen = items
    .filter((o) => o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen)
    .map((o) => o.id);

  function pasLokaalToe(id: string, wijziging: Partial<Melding>) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...wijziging } : o)));
  }

  // Of een verplaatste opdracht "gewijzigd, nog te versturen" wordt: alleen als hij al verstuurd
  // was én niet exact terug op de verzonden plek staat (gelijk aan de server-logica).
  function gewijzigdNa(o: Melding, toegewezenAan: string | null, dag: string, tijd: string | null) {
    const opPlek = opVerzondenPlek(
      { toegewezen_aan: toegewezenAan, startdatum: dag, starttijd: tijd },
      {
        toegewezen_aan: o.verzonden_toegewezen_aan,
        monteur_naam: o.verzonden_monteur,
        startdatum: o.verzonden_startdatum,
        starttijd: o.verzonden_starttijd,
      },
    );
    return moetOpnieuwVersturen(o.dashboard_status) && !opPlek;
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as SleepData | undefined;
    setActief(data?.opdracht ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActief(null);
    const over = e.over?.data.current as
      | { toegewezen_aan?: string; monteur_naam?: string; dag?: string; zone?: string }
      | undefined;
    const data = e.active.data.current as SleepData | undefined;
    if (!over || !data) return;
    const o = data.opdracht;

    // Een week schuiven door naar de rand te slepen (alleen al geplande kaarten).
    if (over.zone === "week-prev" || over.zone === "week-next") {
      if (data.soort !== "kaart" || !o.startdatum) return;
      const richting = over.zone === "week-next" ? 7 : -7;
      const nieuweDatum = verschuifDagen(o.startdatum, richting);
      pasLokaalToe(o.id, {
        startdatum: nieuweDatum,
        gewijzigd_te_versturen: gewijzigdNa(o, o.toegewezen_aan, nieuweDatum, o.starttijd),
      });
      setWeekAnker(verschuifDagen(maandag, richting));
      void verplaats(o, o.toegewezen_aan, o.monteur_naam, nieuweDatum);
      return;
    }

    // Terug naar de pool: ontplannen.
    if (over.zone === "pool") {
      if (data.soort !== "kaart") return;
      pasLokaalToe(o.id, {
        dashboard_status: "binnen",
        monteur_naam: null,
        startdatum: null,
        starttijd: null,
        gewijzigd_te_versturen: false,
      });
      void fetch(`/api/opdrachten/${o.id}/ontplannen`, { method: "POST" }).then(() =>
        router.refresh(),
      );
      return;
    }

    if (!over.dag || !over.toegewezen_aan) return;
    const toegewezenAan = over.toegewezen_aan;
    const monteurNaam = over.monteur_naam ?? null;
    const dag = over.dag;

    if (data.soort === "pool") {
      pasLokaalToe(o.id, {
        toegewezen_aan: toegewezenAan,
        monteur_naam: monteurNaam,
        startdatum: dag,
        starttijd: null,
        duur_dagen: 1,
        dashboard_status: "concept_gepland",
      });
      void fetch(`/api/opdrachten/${o.id}/plannen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toegewezen_aan: toegewezenAan,
          monteur_naam: monteurNaam,
          startdatum: dag,
          duur_dagen: 1,
          starttijd: null,
        }),
      }).then(() => router.refresh());
      return;
    }

    // Verplaatsen van een al geplande kaart.
    if (o.toegewezen_aan === toegewezenAan && o.startdatum === dag) return; // niets veranderd
    pasLokaalToe(o.id, {
      toegewezen_aan: toegewezenAan,
      monteur_naam: monteurNaam,
      startdatum: dag,
      gewijzigd_te_versturen: gewijzigdNa(o, toegewezenAan, dag, o.starttijd),
    });
    void verplaats(o, toegewezenAan, monteurNaam, dag);
  }

  function verplaats(o: Melding, toegewezenAan: string | null, monteurNaam: string | null, dag: string) {
    return fetch(`/api/opdrachten/${o.id}/verplaatsen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toegewezen_aan: toegewezenAan,
        monteur_naam: monteurNaam,
        startdatum: dag,
        starttijd: o.starttijd,
        duur_dagen: o.duur_dagen,
      }),
    }).then(() => router.refresh());
  }

  const navBtn =
    "inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em]";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setWeekAnker(verschuifDagen(maandag, -7))}
          className={`${navBtn} border-line text-ink-muted`}
        >
          <ChevronLeft size={16} aria-hidden="true" /> Vorige
        </button>
        <button
          type="button"
          onClick={() => setWeekAnker(vandaag)}
          className={`${navBtn} border-primary`}
        >
          Vandaag
        </button>
        <button
          type="button"
          onClick={() => setWeekAnker(verschuifDagen(maandag, 7))}
          className={`${navBtn} border-line text-ink-muted`}
        >
          Volgende <ChevronRight size={16} aria-hidden="true" />
        </button>
        <span className="flex-1" />
        <VerstuurKnop ids={teVersturen} />
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Week {weeknr} · {formatDatumKort(dagen[0])} – {formatDatumKort(dagen[4])} · {monteurs.length}{" "}
        {monteurs.length === 1 ? "monteur" : "monteurs"}
      </p>

      <div className="flex items-stretch gap-1">
        <RandZone zone="week-prev" kant="links" />
        <div className="min-w-0 flex-1">
          <PlanbordGrid weekdagen={dagen} monteurs={monteurs} plaatsingen={plaatsingen} />
        </div>
        <RandZone zone="week-next" kant="rechts" />
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-muted">
        <span>Sleep een opdracht uit de strook naar een dag bij een monteur om in te plannen.</span>
        <span>Sleep naar de rand (‹ ›) om een week te schuiven.</span>
      </p>

      <PlanbordPool pool={pool} monteurs={monteurs} standaardDatum={vandaag} />

      <DragOverlay>
        {actief ? (
          <div className="border-2 border-accent bg-white px-3 py-2 text-sm font-extrabold shadow-lg">
            {actief.klant_naam ?? "Onbekende klant"}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
