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
import { monteurRijen, plaatsOpdrachten } from "@/lib/planbord";
import { moetOpnieuwVersturen } from "@/lib/opdracht-status";
import { PlanbordGrid } from "./PlanbordGrid";
import { PlanbordPool } from "./PlanbordPool";

interface SleepData {
  soort: "pool" | "kaart";
  opdracht: Melding;
}

/**
 * Interactieve laag om het planbord. Houdt een eigen kopie van de opdrachten zodat een sleep-actie
 * de kaart meteen op de nieuwe plek toont (optimistisch); de server wordt op de achtergrond
 * bijgewerkt en daarna ververst. Zo geen terugspringen na het loslaten.
 * - pool -> cel: inplannen (concept_gepland, dagblok)
 * - kaart -> cel: verplaatsen (tijd/duur/status blijven; gewijzigd-markering bij verstuurde opdracht)
 * - kaart -> pool: ontplannen (terug naar binnen)
 */
export function PlanbordBord({
  opdrachten,
  weekdagen,
  standaardDatum,
}: {
  opdrachten: Melding[];
  weekdagen: string[];
  standaardDatum: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Melding[]>(opdrachten);
  const [vorigeProp, setVorigeProp] = useState(opdrachten);
  const [actief, setActief] = useState<Melding | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Na een server-refresh de lokale kopie weer gelijktrekken met de waarheid (React-patroon:
  // state bijstellen tijdens render als de prop wijzigt, zonder useEffect).
  if (opdrachten !== vorigeProp) {
    setVorigeProp(opdrachten);
    setItems(opdrachten);
  }

  const monteurs = monteurRijen(items);
  const plaatsingen = plaatsOpdrachten(items, weekdagen);
  const pool = items.filter((o) => o.dashboard_status === "binnen");

  function pasLokaalToe(id: string, wijziging: Partial<Melding>) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...wijziging } : o)));
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as SleepData | undefined;
    setActief(data?.opdracht ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActief(null);
    const over = e.over?.data.current as
      | { monteur?: string; dag?: string; zone?: string }
      | undefined;
    const data = e.active.data.current as SleepData | undefined;
    if (!over || !data) return;
    const o = data.opdracht;

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

    if (!over.monteur || !over.dag) return;
    const monteur = over.monteur;
    const dag = over.dag;

    if (data.soort === "pool") {
      pasLokaalToe(o.id, {
        monteur_naam: monteur,
        startdatum: dag,
        starttijd: null,
        duur_dagen: 1,
        dashboard_status: "concept_gepland",
      });
      void fetch(`/api/opdrachten/${o.id}/plannen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monteur_naam: monteur, startdatum: dag, duur_dagen: 1, starttijd: null }),
      }).then(() => router.refresh());
      return;
    }

    // Verplaatsen van een al geplande kaart.
    if (o.monteur_naam === monteur && o.startdatum === dag) return; // niets veranderd
    pasLokaalToe(o.id, {
      monteur_naam: monteur,
      startdatum: dag,
      gewijzigd_te_versturen: moetOpnieuwVersturen(o.dashboard_status) || o.gewijzigd_te_versturen,
    });
    void fetch(`/api/opdrachten/${o.id}/verplaatsen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monteur_naam: monteur,
        startdatum: dag,
        starttijd: o.starttijd,
        duur_dagen: o.duur_dagen,
        huidigeStatus: o.dashboard_status,
      }),
    }).then(() => router.refresh());
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <PlanbordGrid weekdagen={weekdagen} monteurs={monteurs} plaatsingen={plaatsingen} />

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-muted">
        <span>Sleep een opdracht uit de strook naar een dag bij een monteur om in te plannen.</span>
        <span>Brede balk = montage, kaartje met tijd = service.</span>
      </p>

      <PlanbordPool pool={pool} monteurs={monteurs} standaardDatum={standaardDatum} />

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
