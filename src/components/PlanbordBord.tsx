"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  closestCenter,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import type { Melding } from "@/lib/db";
import {
  maandagVan,
  weekDagen,
  weeknummer,
  verschuifDagen,
  plaatsOpdrachten,
  vindDubbeleBoekingen,
  nieuweDuurNaResize,
  weekschuifLanding,
  weekHeeftWeekendKlus,
  zoekPlanbord,
  type MonteurOptie,
} from "@/lib/planbord";
import { moetOpnieuwVersturen, opVerzondenPlek } from "@/lib/opdracht-status";
import { formatDatumKort } from "@/lib/datum";
import { PlanbordGrid } from "./PlanbordGrid";
import { PlanbordMaand } from "./PlanbordMaand";
import { PlanbordPool } from "./PlanbordPool";
import { VerstuurKnop } from "./VerstuurKnop";

interface SleepData {
  soort: "pool" | "kaart";
  opdracht: Melding;
}

/** Sleepdata van de resize-greep: de opdracht plus zijn huidige plek/breedte op het bord. */
interface ResizeData {
  soort: "resize";
  opdracht: Melding;
  dagIndex: number;
  span: number;
}

type SleepOfResize = SleepData | ResizeData;

/** Lopende resize: welke kaart, zijn zichtbare span, en hoeveel kolommen de rand nu versleept is. */
interface ResizeActief {
  opdracht: Melding;
  span: number;
  deltaKolommen: number;
}

/**
 * Smalle drop-strook naast het raster: sleep een afspraak hierheen om een week te schuiven.
 * Klikken op de strook doet hetzelfde als de Vorige/Volgende-knoppen boven het bord.
 */
function RandZone({
  zone,
  kant,
  onClick,
}: {
  zone: string;
  kant: "links" | "rechts";
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone, data: { zone } });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      title={kant === "links" ? "Vorige week" : "Volgende week"}
      className={`mt-3 flex w-7 shrink-0 cursor-pointer select-none items-center justify-center border-2 transition-colors ${
        isOver
          ? "border-accent bg-accent/15 text-accent"
          : "border-dashed border-line text-ink-muted hover:border-primary hover:text-primary"
      }`}
    >
      {kant === "links" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </div>
  );
}

/** Leest de weekend-voorkeur uit localStorage (client). Server/SSR levert false via getServerSnapshot. */
function leesWeekendVoorkeur(): boolean {
  try {
    return localStorage.getItem("planbord-weekend") === "1";
  } catch {
    return false;
  }
}

/** Leest de week/maand-weergave uit localStorage. Server/SSR levert "week" via getServerSnapshot. */
function leesWeergave(): "week" | "maand" {
  try {
    return localStorage.getItem("planbord-weergave") === "maand" ? "maand" : "week";
  } catch {
    return "week";
  }
}

/** Eerst kijken wat er direct onder de pointer ligt; pas daarna geometrisch dichtstbijzijnde. */
const collisionDetectie: CollisionDetection = (args) => {
  const direct = pointerWithin(args);
  return direct.length > 0 ? direct : closestCenter(args);
};

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
  const [zoek, setZoek] = useState("");
  // Weekend tonen (za + zo als extra kolommen). Voorkeur onthouden in localStorage via
  // useSyncExternalStore: server-snapshot = false (geen hydratie-mismatch), client leest de opgeslagen
  // waarde. Een wissel schrijft localStorage en stoot een event af zodat de weergave meteen meeloopt.
  const subscribeWeekend = useCallback((herteken: () => void) => {
    window.addEventListener("storage", herteken);
    window.addEventListener("planbord-weekend-wissel", herteken);
    return () => {
      window.removeEventListener("storage", herteken);
      window.removeEventListener("planbord-weekend-wissel", herteken);
    };
  }, []);
  const toonWeekend = useSyncExternalStore(subscribeWeekend, leesWeekendVoorkeur, () => false);
  function wisselWeekend() {
    try {
      localStorage.setItem("planbord-weekend", leesWeekendVoorkeur() ? "0" : "1");
    } catch {
      /* opslaan mislukt: voorkeur geldt alleen deze sessie */
    }
    window.dispatchEvent(new Event("planbord-weekend-wissel"));
  }
  // Week- of maandweergave, onthouden in localStorage (zelfde hydratie-veilige aanpak).
  const subscribeWeergave = useCallback((herteken: () => void) => {
    window.addEventListener("storage", herteken);
    window.addEventListener("planbord-weergave-wissel", herteken);
    return () => {
      window.removeEventListener("storage", herteken);
      window.removeEventListener("planbord-weergave-wissel", herteken);
    };
  }, []);
  const weergave = useSyncExternalStore(subscribeWeergave, leesWeergave, () => "week" as const);
  function zetWeergave(naar: "week" | "maand") {
    try {
      localStorage.setItem("planbord-weergave", naar);
    } catch {
      /* opslaan mislukt: geldt alleen deze sessie */
    }
    window.dispatchEvent(new Event("planbord-weergave-wissel"));
  }
  const [items, setItems] = useState<Melding[]>(opdrachten);
  const [vorigeProp, setVorigeProp] = useState(opdrachten);
  const [actief, setActief] = useState<Melding | null>(null);
  // Een al verstuurde/bevestigde klus die naar de pool gesleept is, wacht op bevestiging (de monteur
  // krijgt dan bericht). Concept-klussen gaan stil terug en zetten dit niet.
  const [bevestigOntplan, setBevestigOntplan] = useState<Melding | null>(null);
  // Opdrachten waarvan de planning-opslag nog naar de server onderweg is. Zolang dat loopt mogen ze niet
  // verstuurd worden: de monteur-koppeling (toegewezen_aan) staat dan nog niet in de database, waardoor
  // de SMS-notificatie zou wegvallen (de mail valt terug op het standaardadres, de SMS heeft de koppeling
  // nodig). Voorkomt die race tussen inslepen en versturen.
  const [opslaanBezig, setOpslaanBezig] = useState<ReadonlySet<string>>(new Set<string>());
  const [resizeActief, setResizeActief] = useState<ResizeActief | null>(null);
  // Het rasteromhulsel meten we om de kolombreedte te bepalen (104px labelkolom + 5 gelijke dagkolommen),
  // zodat we een horizontale sleep-afstand in pixels naar een aantal dagkolommen kunnen omrekenen.
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function kolomBreedte(): number {
    const w = gridWrapRef.current?.offsetWidth ?? 0;
    return w > 104 ? (w - 104) / 5 : 0;
  }

  // Na een server-refresh de lokale kopie weer gelijktrekken (render-patroon, geen useEffect).
  if (opdrachten !== vorigeProp) {
    setVorigeProp(opdrachten);
    setItems(opdrachten);
  }

  const maandag = maandagVan(weekAnker);
  // Weekend tonen als de knop aan staat, OF als deze week een klus op za/zo heeft (anders zou die
  // weekend-klus onzichtbaar van het bord vallen, dat mag nooit).
  const effectiefWeekend = toonWeekend || weekHeeftWeekendKlus(items, maandag, toonWeekend);
  const dagen = weekDagen(maandag, effectiefWeekend);
  const weeknr = weeknummer(maandag);
  // Plaatsing en conflicten rekenen het weekend mee als de KNOP aan staat (toonWeekend), niet als hij
  // alleen geforceerd getoond wordt door een losse weekend-klus: een gewone montage springt dan nog
  // steeds over het weekend, terwijl die ene weekend-klus wel zichtbaar blijft.
  const plaatsingen = plaatsOpdrachten(items, dagen, toonWeekend);
  const conflicten = vindDubbeleBoekingen(items, toonWeekend);
  // Vangnet: elke ingeplande klus moet een rij krijgen, ook als zijn account niet (meer) in de
  // monteurlijst staat (bv. hernoemd of verwijderd). Zonder dit zou zo'n klus onzichtbaar van het bord
  // verdwijnen terwijl hij gewoon in de database staat.
  const rijMonteurs = (() => {
    const bekend = new Set(monteurs.map((m) => m.id));
    const gezien = new Set<string>();
    const extra: { id: string; naam: string }[] = [];
    for (const p of plaatsingen) {
      const id = p.opdracht.toegewezen_aan;
      if (id && !bekend.has(id) && !gezien.has(id)) {
        gezien.add(id);
        extra.push({ id, naam: p.opdracht.monteur_naam ?? "Onbekende monteur" });
      }
    }
    return extra.length ? [...monteurs, ...extra] : monteurs;
  })();
  const pool = items.filter((o) => o.dashboard_status === "binnen");
  const treffers = zoek.trim() ? zoekPlanbord(items, zoek).slice(0, 8) : [];

  /** Springt het bord naar de week van een treffer (of laat de pool zien als hij nog niet gepland is). */
  function springNaar(o: Melding) {
    if (o.startdatum) setWeekAnker(maandagVan(o.startdatum));
    setZoek("");
  }
  const teVersturen = items
    .filter(
      (o) =>
        (o.dashboard_status === "concept_gepland" || o.gewijzigd_te_versturen) && !opslaanBezig.has(o.id),
    )
    .map((o) => o.id);

  function pasLokaalToe(id: string, wijziging: Partial<Melding>) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, ...wijziging } : o)));
  }

  // Markeert een opdracht als "opslag loopt" / "opslag klaar", zodat versturen erop wacht (zie opslaanBezig).
  function startOpslag(id: string) {
    setOpslaanBezig((prev) => new Set(prev).add(id));
  }
  function eindOpslag(id: string) {
    setOpslaanBezig((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
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
    const data = e.active.data.current as SleepOfResize | undefined;
    // De resize-greep krijgt geen sleep-overlay (de balk rekt zelf uit); we onthouden alleen de start.
    if (data?.soort === "resize") {
      setResizeActief({ opdracht: data.opdracht, span: data.span, deltaKolommen: 0 });
      return;
    }
    setActief(data?.opdracht ?? null);
  }

  function onDragMove(e: DragMoveEvent) {
    setResizeActief((huidig) => {
      if (!huidig) return huidig;
      const cw = kolomBreedte();
      const delta = cw > 0 ? Math.round(e.delta.x / cw) : 0;
      return delta === huidig.deltaKolommen ? huidig : { ...huidig, deltaKolommen: delta };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActief(null);
    const data = e.active.data.current as SleepOfResize | undefined;

    // Resize afronden: nieuwe duur berekenen uit het aantal versleepte kolommen en opslaan.
    if (resizeActief && data?.soort === "resize") {
      const r = resizeActief;
      setResizeActief(null);
      const o = data.opdracht;
      pasDuurToe(o, nieuweDuurNaResize(o.duur_dagen, r.span, r.deltaKolommen));
      return;
    }

    const over = e.over?.data.current as
      | { toegewezen_aan?: string; monteur_naam?: string; dag?: string; zone?: string }
      | undefined;
    if (!over || !data) return;
    const o = data.opdracht;

    // Een week schuiven door naar de rand te slepen (alleen al geplande kaarten).
    if (over.zone === "week-prev" || over.zone === "week-next") {
      if (data.soort !== "kaart" || !o.startdatum) return;
      const richting = over.zone === "week-next" ? 7 : -7;
      // Volgende week -> maandag (begin); vorige week -> laatste getoonde dag (vr of zo, afh. van weekend).
      const nieuweDatum = weekschuifLanding(o.startdatum, richting, effectiefWeekend);
      pasLokaalToe(o.id, {
        startdatum: nieuweDatum,
        gewijzigd_te_versturen: gewijzigdNa(o, o.toegewezen_aan, nieuweDatum, o.starttijd),
      });
      setWeekAnker(verschuifDagen(maandag, richting));
      void verplaats(o, o.toegewezen_aan, o.monteur_naam, nieuweDatum);
      return;
    }

    // Terug naar de pool: ontplannen. Was de klus al naar de monteur verstuurd (gepland/bevestigd),
    // dan eerst bevestigen, want hij krijgt er bericht over. Een concept gaat stil terug.
    if (over.zone === "pool") {
      if (data.soort !== "kaart") return;
      if (moetOpnieuwVersturen(o.dashboard_status)) {
        setBevestigOntplan(o);
        return;
      }
      voerOntplanUit(o);
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
      startOpslag(o.id);
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
      })
        .then(() => router.refresh())
        .finally(() => eindOpslag(o.id));
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

  // Voert het ontplannen daadwerkelijk uit: kaart optimistisch naar de pool, dan de server. De route
  // mailt de monteur als de klus al verstuurd was.
  function voerOntplanUit(o: Melding) {
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
  }

  // Resize opslaan: zelfde plek (monteur/dag/tijd), alleen een andere duur. De route herkent de
  // duur-wijziging en markeert een al verstuurde klus opnieuw als "te versturen".
  function verplaatsMetDuur(o: Melding, nieuweDuur: number) {
    if (!o.startdatum) return Promise.resolve();
    startOpslag(o.id);
    return fetch(`/api/opdrachten/${o.id}/verplaatsen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toegewezen_aan: o.toegewezen_aan,
        monteur_naam: o.monteur_naam,
        startdatum: o.startdatum,
        starttijd: o.starttijd,
        duur_dagen: nieuweDuur,
      }),
    })
      .then(() => router.refresh())
      .finally(() => eindOpslag(o.id));
  }

  // Past een nieuwe duur toe (optimistisch + opslaan), gedeeld door de resize-greep en de -/+ knoppen.
  // Een al verstuurde klus die korter/langer wordt, gaat opnieuw "te versturen" (monteur moet het weten).
  function pasDuurToe(o: Melding, nieuweDuur: number) {
    if (!o.startdatum || nieuweDuur === o.duur_dagen) return;
    pasLokaalToe(o.id, {
      duur_dagen: nieuweDuur,
      gewijzigd_te_versturen:
        gewijzigdNa(o, o.toegewezen_aan, o.startdatum, o.starttijd) ||
        (moetOpnieuwVersturen(o.dashboard_status) && o.startdatum != null),
    });
    void verplaatsMetDuur(o, nieuweDuur);
  }

  function verplaats(o: Melding, toegewezenAan: string | null, monteurNaam: string | null, dag: string) {
    startOpslag(o.id);
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
    })
      .then(() => router.refresh())
      .finally(() => eindOpslag(o.id));
  }

  const navBtn =
    "inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em]";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectie}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      <div className="relative mb-3">
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek een klus: klant, referentie of adres…"
          aria-label="Zoek een klus op het planbord"
          className="min-h-[44px] w-full border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
        />
        {treffers.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-auto border-2 border-ink bg-white shadow-lg">
            {treffers.map((o) => (
              <li key={o.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => springNaar(o)}
                  className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
                >
                  <span className="text-sm font-bold text-ink">{o.klant_naam ?? "Onbekende klant"}</span>
                  {o.referentienummer && (
                    <span className="text-sm text-ink-muted"> · ref {o.referentienummer}</span>
                  )}
                  <span className="block text-xs text-ink-muted">
                    {o.startdatum
                      ? `${o.monteur_naam ?? "?"} · week ${weeknummer(maandagVan(o.startdatum))} · ${formatDatumKort(o.startdatum)}`
                      : "In de pool (nog te plannen)"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {zoek.trim() && treffers.length === 0 && (
          <p className="absolute z-30 mt-1 w-full border-2 border-line bg-white px-3 py-2 text-sm text-ink-muted">
            Niets gevonden voor &quot;{zoek.trim()}&quot;.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Week- of maandweergave kiezen */}
        <div className="inline-flex border-[1.5px] border-ink">
          {(["week", "maand"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => zetWeergave(w)}
              aria-pressed={weergave === w}
              className={`px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em] ${
                weergave === w ? "bg-ink text-white" : "bg-white text-ink-muted"
              }`}
            >
              {w === "week" ? "Week" : "Maand"}
            </button>
          ))}
        </div>
        {weergave === "week" && (
          <>
            <button
              type="button"
              onClick={() => setWeekAnker(verschuifDagen(maandag, -7))}
              className={`${navBtn} border-line text-ink-muted`}
            >
              <ChevronLeft size={16} aria-hidden="true" /> Vorige
            </button>
            <button type="button" onClick={() => setWeekAnker(vandaag)} className={`${navBtn} border-primary`}>
              Vandaag
            </button>
            <button
              type="button"
              onClick={() => setWeekAnker(verschuifDagen(maandag, 7))}
              className={`${navBtn} border-line text-ink-muted`}
            >
              Volgende <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>
        )}
        {(() => {
          // In maandmodus geldt de knop-stand de voorkeur (toonWeekend); in weekmodus de echte stand
          // (effectiefWeekend, die ook geforceerd "aan" kan zijn door een weekend-klus deze week).
          const knopAan = weergave === "maand" ? toonWeekend : effectiefWeekend;
          return (
            <button
              type="button"
              onClick={wisselWeekend}
              aria-pressed={knopAan}
              title={
                weergave === "week" && effectiefWeekend && !toonWeekend
                  ? "Weekend blijft zichtbaar: er staat een klus in dit weekend"
                  : "Zaterdag en zondag tonen of verbergen"
              }
              className={`${navBtn} ${knopAan ? "border-primary text-primary" : "border-line text-ink-muted"}`}
            >
              Weekend {knopAan ? "aan" : "uit"}
            </button>
          );
        })()}
        <span className="flex-1" />
        <VerstuurKnop ids={teVersturen} />
      </div>

      {weergave === "maand" ? (
        <PlanbordMaand
          items={items}
          monteurs={rijMonteurs}
          anker={weekAnker}
          vandaag={vandaag}
          toonWeekend={toonWeekend}
          onAnker={setWeekAnker}
        />
      ) : (
        <>
      <p className="mt-2 text-sm text-ink-muted">
        Week {weeknr} · {formatDatumKort(dagen[0])} – {formatDatumKort(dagen[dagen.length - 1])} ·{" "}
        {monteurs.length} {monteurs.length === 1 ? "monteur" : "monteurs"}
      </p>

      {conflicten.size > 0 && (
        <p className="mt-2 flex items-center gap-2 border-2 border-urgent-rood bg-urgent-rood/10 px-3 py-2 text-sm font-bold text-urgent-rood">
          <AlertTriangle size={16} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
          Let op: dubbele boeking. Een of meer monteurs staan op dezelfde dag/tijd dubbel ingepland
          (rood gemarkeerd).
        </p>
      )}

      <div className="flex items-stretch gap-1">
        <RandZone zone="week-prev" kant="links" onClick={() => setWeekAnker(verschuifDagen(maandag, -7))} />
        <div ref={gridWrapRef} className="min-w-0 flex-1">
          <PlanbordGrid
            weekdagen={dagen}
            monteurs={rijMonteurs}
            plaatsingen={plaatsingen}
            conflicten={conflicten}
            onDuur={pasDuurToe}
            resize={
              resizeActief
                ? { id: resizeActief.opdracht.id, deltaKolommen: resizeActief.deltaKolommen }
                : null
            }
          />
        </div>
        <RandZone zone="week-next" kant="rechts" onClick={() => setWeekAnker(verschuifDagen(maandag, 7))} />
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-muted">
        <span>Sleep een klus uit de strook naar een dag bij een monteur om in te plannen.</span>
        <span>Sleep naar de rand (‹ ›) om een week te schuiven.</span>
      </p>

      <PlanbordPool pool={pool} monteurs={monteurs} standaardDatum={maandag} />
        </>
      )}

      <DragOverlay>
        {actief ? (
          <div className="border-2 border-accent bg-white px-3 py-2 text-sm font-extrabold shadow-lg">
            {actief.klant_naam ?? "Onbekende klant"}
          </div>
        ) : null}
      </DragOverlay>

      {bevestigOntplan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Klus van de planning halen"
          onClick={() => setBevestigOntplan(null)}
        >
          <div
            className="w-full max-w-md border-2 border-urgent-rood bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-urgent-rood" aria-hidden="true" />
              <div>
                <h2 className="font-mono text-lg font-extrabold text-ink">Van de planning halen?</h2>
                <p className="mt-2 text-sm text-ink">
                  De klus voor{" "}
                  <span className="font-bold">{bevestigOntplan.klant_naam ?? "deze klant"}</span> is al
                  naar de monteur verstuurd. Als je hem terug naar de pool zet, krijgt de monteur
                  automatisch bericht en verdwijnt de klus uit zijn werkpool.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const o = bevestigOntplan;
                  setBevestigOntplan(null);
                  voerOntplanUit(o);
                }}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-urgent-rood px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent"
              >
                Ja, van planning halen
              </button>
              <button
                type="button"
                onClick={() => setBevestigOntplan(null)}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                Nee
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
