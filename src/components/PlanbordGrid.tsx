import Link from "next/link";
import { Package, Wrench } from "lucide-react";
import type { Melding, DashboardStatus } from "@/lib/db";
import type { PlanbordPlaatsing } from "@/lib/planbord";
import { duurLabel } from "@/lib/opdracht-weergave";

const DOW = ["ma", "di", "wo", "do", "vr"];

/** Rand/streep-classes per status voor blokken en kaarten op het bord. */
const KLEUR: Record<DashboardStatus, { rand: string; streep: string; links: string }> = {
  binnen: { rand: "border-ink-muted", streep: "bg-ink-muted", links: "border-l-ink-muted" },
  concept_gepland: {
    rand: "border-accent border-dashed",
    streep: "bg-accent",
    links: "border-l-accent",
  },
  gepland: { rand: "border-accent", streep: "bg-accent", links: "border-l-accent" },
  bevestigd: { rand: "border-bevestigd", streep: "bg-bevestigd", links: "border-l-bevestigd" },
  opgeleverd: { rand: "border-success", streep: "bg-success", links: "border-l-success" },
  geannuleerd: { rand: "border-line", streep: "bg-line", links: "border-l-line" },
};

function dagLabel(iso: string): string {
  return String(parseInt(iso.split("-")[2], 10));
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
        Nog niets ingepland deze week. Plan hieronder een opdracht in, dan verschijnt de monteur hier
        als rij.
      </p>
    );
  }

  const montages = plaatsingen.filter((p) => !p.isService);
  // Service-kaarten groeperen per cel (monteur + dag), gesorteerd op tijd.
  const serviceCellen = new Map<string, PlanbordPlaatsing<Melding>[]>();
  for (const p of plaatsingen) {
    if (!p.isService) continue;
    const r = monteurs.indexOf(p.opdracht.toegewezen_aan ?? "");
    if (r === -1) continue;
    const key = `${r}-${p.dagIndex}`;
    (serviceCellen.get(key) ?? serviceCellen.set(key, []).get(key)!).push(p);
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

      {/* Monteur-labels + lege cellen (rasterlijnen) */}
      {monteurs.map((m, r) => (
        <div
          key={`label-${m}`}
          className="flex items-center gap-2 border-b border-r border-line px-2.5 py-2 font-extrabold"
          style={{ gridRow: r + 2, gridColumn: 1 }}
        >
          {m}
        </div>
      ))}
      {monteurs.map((m, r) =>
        weekdagen.map((d, c) => (
          <div
            key={`cel-${r}-${c}`}
            className="min-h-[92px] border-b border-r border-line last:border-r-0"
            style={{ gridRow: r + 2, gridColumn: c + 2 }}
          />
        )),
      )}

      {/* Montage = brede dagbalk */}
      {montages.map((p) => {
        const r = monteurs.indexOf(p.opdracht.toegewezen_aan ?? "");
        if (r === -1) return null;
        const k = KLEUR[p.opdracht.dashboard_status];
        return (
          <Link
            key={p.opdracht.id}
            href={`/opdracht/${p.opdracht.id}`}
            className={`m-1 grid grid-cols-[6px_1fr] self-start overflow-hidden border-[1.5px] bg-white ${k.rand}`}
            style={{ gridRow: r + 2, gridColumn: `${p.dagIndex + 2} / span ${p.span}` }}
          >
            <span aria-hidden className={k.streep} />
            <span className="min-w-0 px-2 py-1.5">
              <span className="block text-[13px] font-extrabold leading-tight">
                {p.opdracht.klant_naam ?? "Onbekende klant"}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-muted">
                {p.opdracht.referentienummer && (
                  <span className="font-mono font-bold text-primary">
                    {p.opdracht.referentienummer}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Package size={12} strokeWidth={2.2} aria-hidden="true" />
                  {duurLabel(p.opdracht.duur_dagen)}
                </span>
                {p.opdracht.dashboard_status === "concept_gepland" && (
                  <span className="font-bold text-accent">nog te versturen</span>
                )}
              </span>
            </span>
          </Link>
        );
      })}

      {/* Service = compacte kaartjes, gestapeld op tijd */}
      {[...serviceCellen.entries()].map(([key, cel]) => {
        const [r, c] = key.split("-").map(Number);
        const gesorteerd = [...cel].sort((a, b) =>
          (a.opdracht.starttijd ?? "").localeCompare(b.opdracht.starttijd ?? ""),
        );
        return (
          <div
            key={`svc-${key}`}
            className="m-1 flex flex-col gap-1.5 self-start"
            style={{ gridRow: r + 2, gridColumn: c + 2 }}
          >
            {gesorteerd.map((p) => {
              const k = KLEUR[p.opdracht.dashboard_status];
              return (
                <Link
                  key={p.opdracht.id}
                  href={`/opdracht/${p.opdracht.id}`}
                  className={`border-[1.5px] border-l-[5px] bg-white px-2 py-1.5 ${k.rand} ${k.links}`}
                >
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[12px] font-extrabold text-primary">
                      {(p.opdracht.starttijd ?? "").slice(0, 5)}
                    </span>
                    <span className="truncate text-[12px] font-bold">
                      {p.opdracht.klant_naam ?? "Onbekende klant"}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-muted">
                    <Wrench size={11} strokeWidth={2.2} aria-hidden="true" />
                    {p.opdracht.referentienummer ?? "geen ref"}
                    {p.opdracht.dashboard_status === "concept_gepland" && (
                      <span className="ml-auto font-bold text-accent">te versturen</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
