"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, Wrench } from "lucide-react";
import type { Melding, DashboardStatus } from "@/lib/db";
import {
  maandWeken,
  verschuifMaand,
  weekDagen,
  weeknummer,
  weekHeeftWeekendKlus,
  plaatsOpdrachten,
  verdeelLanes,
  type MonteurOptie,
} from "@/lib/planbord";

const DOW = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** Dunne gekleurde linkerrand per status, zelfde taal als het weekbord. */
const RAND: Record<DashboardStatus, string> = {
  binnen: "border-l-ink-muted",
  concept_gepland: "border-l-accent",
  gepland: "border-l-urgent-geel",
  bevestigd: "border-l-bevestigd",
  opgeleverd: "border-l-success",
  geannuleerd: "border-l-line",
};

function maandLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MAANDEN[m - 1]} ${y}`;
}

function dagNummer(iso: string): string {
  return String(parseInt(iso.split("-")[2], 10));
}

/** Eén compacte week-strook: monteurs als rijen, ma t/m vr als kolommen, klussen als kleine balkjes. */
function WeekStrook({
  maandag,
  monteurs,
  items,
  vandaag,
  toonWeekend,
}: {
  maandag: string;
  monteurs: MonteurOptie[];
  items: Melding[];
  vandaag: string;
  toonWeekend: boolean;
}) {
  // Beweegt mee met de weekend-instelling: weekend tonen als de knop aan staat, of als deze week een
  // klus heeft die het weekend meetelt en op za/zo valt (anders zou die weekend-klus ook in het
  // maandoverzicht onzichtbaar zijn). De plaatsing leest de weekend-keuze per klus (weekend_telt_mee).
  const effectiefWeekend = toonWeekend || weekHeeftWeekendKlus(items, maandag);
  const dagen = weekDagen(maandag, effectiefWeekend);
  const plaatsingen = plaatsOpdrachten(items, dagen);
  const perMonteur = monteurs.map((a) => {
    const eigen = plaatsingen.filter((p) => p.opdracht.toegewezen_aan === a.id);
    const kaarten = verdeelLanes(eigen);
    const laneCount = Math.max(1, ...kaarten.map((k) => k.lane + 1));
    return { account: a, kaarten, laneCount };
  });
  const rijen = perMonteur.map((mb, i) => {
    const startRow = 2 + perMonteur.slice(0, i).reduce((s, x) => s + x.laneCount, 0);
    return { account: mb.account, startRow, laneCount: mb.laneCount, kaarten: mb.kaarten };
  });

  return (
    <div className="border-2 border-ink bg-white">
      <div className="flex items-center gap-2 border-b-2 border-ink bg-surface px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        Week {weeknummer(maandag)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `84px repeat(${dagen.length}, minmax(0, 1fr))` }}>
        {/* Kop met dagnummers */}
        <div className="border-b border-r border-line bg-surface" style={{ gridRow: 1, gridColumn: 1 }} />
        {dagen.map((d, i) => (
          <div
            key={d}
            className={`border-b border-r border-line px-1.5 py-1 text-center last:border-r-0 ${
              d === vandaag ? "bg-accent/10" : i >= 5 ? "bg-surface/60" : "bg-surface"
            }`}
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            <span className="text-[10px] uppercase text-ink-muted">{DOW[i]} </span>
            <span className="text-[11px] font-bold">{dagNummer(d)}</span>
          </div>
        ))}

        {rijen.map(({ account, startRow, laneCount, kaarten }) => (
          <div key={account.id} className="contents">
            <div
              className="flex items-center border-b border-r border-line bg-surface px-2 py-1 text-[11px] font-bold"
              style={{ gridRow: `${startRow} / span ${laneCount}`, gridColumn: 1 }}
            >
              <span className="truncate">{account.naam}</span>
            </div>
            {Array.from({ length: laneCount }).map((_, lane) =>
              dagen.map((d, c) => (
                <div
                  key={`c-${account.id}-${lane}-${c}`}
                  className={`min-h-[26px] border-b border-r border-line last:border-r-0 ${
                    d === vandaag ? "bg-accent/5" : c >= 5 ? "bg-surface/40" : ""
                  }`}
                  style={{ gridRow: startRow + lane, gridColumn: c + 2 }}
                />
              )),
            )}
            {kaarten.map(({ plaatsing: p, lane }) => {
              const o = p.opdracht;
              return (
                <Link
                  key={o.id}
                  href={`/dashboard/opdracht/${o.id}?from=planbord&week=${maandag}`}
                  title={`${o.klant_naam ?? "Onbekend"}${o.referentienummer ? ` · ${o.referentienummer}` : ""}`}
                  className={`m-0.5 flex items-center gap-1 overflow-hidden border border-l-[3px] bg-white px-1 py-0.5 text-[10.5px] leading-tight ${RAND[o.dashboard_status]} border-y-line border-r-line`}
                  style={{ gridRow: startRow + lane, gridColumn: `${p.dagIndex + 2} / span ${p.span}` }}
                >
                  {p.isService ? (
                    <Wrench size={9} strokeWidth={2.2} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  ) : (
                    <Package size={9} strokeWidth={2.2} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  )}
                  {p.isService && (
                    <span className="shrink-0 font-mono font-bold text-primary">
                      {(o.starttijd ?? "").slice(0, 5)}
                    </span>
                  )}
                  <span className="truncate font-bold">{o.klant_naam ?? "Onbekend"}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Maandoverzicht (optie C): vijf of zes compacte week-stroken onder elkaar, met maand-navigatie. */
export function PlanbordMaand({
  items,
  monteurs,
  anker,
  vandaag,
  toonWeekend,
  onAnker,
}: {
  items: Melding[];
  monteurs: MonteurOptie[];
  anker: string;
  vandaag: string;
  toonWeekend: boolean;
  onAnker: (iso: string) => void;
}) {
  const weken = maandWeken(anker);
  const navBtn =
    "inline-flex cursor-pointer items-center gap-1.5 border-[1.5px] border-line px-3 py-2 text-[13px] font-bold uppercase tracking-[0.03em] text-ink-muted";

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onAnker(verschuifMaand(anker, -1))} className={navBtn}>
          <ChevronLeft size={16} aria-hidden="true" /> Vorige
        </button>
        <span className="min-w-[140px] text-center text-base font-extrabold capitalize">
          {maandLabel(verschuifMaand(anker, 0))}
        </span>
        <button type="button" onClick={() => onAnker(verschuifMaand(anker, 1))} className={navBtn}>
          Volgende <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {monteurs.length === 0 ? (
        <p className="mt-3 border-2 border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">
          Nog geen monteurs om klussen aan te tonen.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {weken.map((ma) => (
            <WeekStrook
              key={ma}
              maandag={ma}
              monteurs={monteurs}
              items={items}
              vandaag={vandaag}
              toonWeekend={toonWeekend}
            />
          ))}
        </div>
      )}
    </div>
  );
}
