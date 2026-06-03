"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Melding } from "@/lib/db";
import type { PlanbordPlaatsing } from "@/lib/planbord";
import { PlanbordGrid } from "./PlanbordGrid";
import { PlanbordPool } from "./PlanbordPool";

interface SleepData {
  soort: "pool" | "kaart";
  opdracht: Melding;
}

/**
 * Interactieve laag om het planbord: pool-opdrachten naar een cel slepen plant ze in
 * (concept_gepland, dagblok), een al geplande kaart naar een andere cel slepen verplaatst hem
 * (tijd/duur blijven, status blijft, gewijzigd-markering bij een verstuurde opdracht).
 * Precieze invoer (dagen/tijd) blijft via het inplan-formulier.
 */
export function PlanbordBord({
  weekdagen,
  monteurs,
  plaatsingen,
  pool,
  standaardDatum,
}: {
  weekdagen: string[];
  monteurs: string[];
  plaatsingen: PlanbordPlaatsing<Melding>[];
  pool: Melding[];
  standaardDatum: string;
}) {
  const router = useRouter();
  const [actief, setActief] = useState<Melding | null>(null);
  const [bezig, setBezig] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as SleepData | undefined;
    setActief(data?.opdracht ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActief(null);
    const cel = e.over?.data.current as { monteur: string; dag: string } | undefined;
    const data = e.active.data.current as SleepData | undefined;
    if (!cel?.dag || !data) return;

    setBezig(true);
    try {
      if (data.soort === "pool") {
        await fetch(`/api/opdrachten/${data.opdracht.id}/plannen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toegewezen_aan: cel.monteur,
            startdatum: cel.dag,
            duur_dagen: 1,
            starttijd: null,
          }),
        });
      } else {
        const o = data.opdracht;
        if (o.toegewezen_aan === cel.monteur && o.startdatum === cel.dag) return; // niets veranderd
        await fetch(`/api/opdrachten/${o.id}/verplaatsen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toegewezen_aan: cel.monteur,
            startdatum: cel.dag,
            starttijd: o.starttijd,
            duur_dagen: o.duur_dagen,
            huidigeStatus: o.dashboard_status,
          }),
        });
      }
      router.refresh();
    } finally {
      setBezig(false);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={bezig ? "pointer-events-none opacity-70" : undefined}>
        <PlanbordGrid weekdagen={weekdagen} monteurs={monteurs} plaatsingen={plaatsingen} />

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-muted">
          <span>Sleep een opdracht uit de strook naar een dag bij een monteur om in te plannen.</span>
          <span>Brede balk = montage, kaartje met tijd = service.</span>
        </p>

        <PlanbordPool pool={pool} monteurs={monteurs} standaardDatum={standaardDatum} />
      </div>

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
