"use client";

import { useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import type { Melding, DashboardStatus } from "@/lib/db";
import type { TeDoenTelling } from "@/lib/te-doen";
import { ALLE_STATUSSEN } from "@/lib/opdracht-status";
import {
  filterOpdrachten,
  groepeerPerStatus,
  type StatusFilter,
} from "@/lib/dashboard-lijst";
import { OpdrachtDashboardCard } from "./OpdrachtDashboardCard";
import { TeDoenOverzicht } from "./TeDoenOverzicht";

const SECTIE_LABEL: Record<DashboardStatus, string> = {
  binnen: "Binnen — te plannen",
  concept_gepland: "Concept gepland — nog te versturen",
  gepland: "Gepland — verstuurd, te bevestigen",
  bevestigd: "Bevestigd",
  opgeleverd: "Opgeleverd",
  geannuleerd: "Geannuleerd",
};

const CHIP: Record<StatusFilter, { label: string; basis: string; actief: string }> = {
  alle: { label: "Alle", basis: "border-ink", actief: "bg-ink text-white border-ink" },
  binnen: { label: "Binnen", basis: "border-ink-muted", actief: "bg-ink-muted text-white border-ink-muted" },
  concept_gepland: { label: "Concept", basis: "border-accent", actief: "bg-accent text-white border-accent" },
  gepland: { label: "Gepland", basis: "border-urgent-geel", actief: "bg-urgent-geel text-ink border-urgent-geel" },
  bevestigd: { label: "Bevestigd", basis: "border-bevestigd", actief: "bg-bevestigd text-white border-bevestigd" },
  opgeleverd: { label: "Opgeleverd", basis: "border-success", actief: "bg-success text-white border-success" },
  geannuleerd: { label: "Geannuleerd", basis: "border-line", actief: "bg-ink-muted text-white border-ink-muted" },
};

const CHIP_VOLGORDE: StatusFilter[] = ["alle", ...ALLE_STATUSSEN];

export function DashboardLijst({
  opdrachten,
  telling,
}: {
  opdrachten: Melding[];
  telling: TeDoenTelling;
}) {
  const [zoek, setZoek] = useState("");
  const [status, setStatus] = useState<StatusFilter>("alle");
  // Geannuleerde opdrachten staan standaard ingeklapt onder hun kopje, zodat ze de lijst niet
  // vullen. Bij het expliciete geannuleerd-filter wil je ze juist zien, dan staat de sectie open.
  const [geannuleerdOpen, setGeannuleerdOpen] = useState(false);

  const tellingPerStatus = useMemo(() => {
    const t: Record<string, number> = { alle: opdrachten.length };
    for (const s of ALLE_STATUSSEN) t[s] = opdrachten.filter((o) => o.dashboard_status === s).length;
    return t;
  }, [opdrachten]);

  const groepen = useMemo(
    () => groepeerPerStatus(filterOpdrachten(opdrachten, { zoek, status })),
    [opdrachten, zoek, status],
  );

  return (
    <div>
      <TeDoenOverzicht telling={telling} onKies={setStatus} />

      {/* Zoeken */}
      <label className="mt-4 flex min-h-[44px] items-center gap-2 border-[1.5px] border-line bg-white px-3">
        <Search size={18} strokeWidth={2.2} className="text-ink-muted" aria-hidden="true" />
        <input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek op klant, referentie of monteur"
          className="w-full bg-transparent text-[15px] outline-none"
        />
      </label>

      {/* Status-filter */}
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIP_VOLGORDE.map((key) => {
          const c = CHIP[key];
          const actief = status === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 border-2 px-3 py-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.04em] ${
                actief ? c.actief : `bg-white text-ink ${c.basis}`
              }`}
            >
              {c.label}
              <span className="font-bold opacity-60">{tellingPerStatus[key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Secties */}
      {groepen.length === 0 ? (
        <p className="mt-8 text-[14.5px] text-ink-muted">
          Geen opdrachten gevonden voor deze filter of zoekopdracht.
        </p>
      ) : (
        groepen.map((g) => {
          // De geannuleerd-sectie is inklapbaar (dicht bij filter "alle", open bij het eigen filter).
          const inklapbaar = g.status === "geannuleerd" && status !== "geannuleerd";
          const open = !inklapbaar || geannuleerdOpen;
          return (
            <section key={g.status} className="mt-7">
              {inklapbaar ? (
                <button
                  type="button"
                  onClick={() => setGeannuleerdOpen((v) => !v)}
                  aria-expanded={open}
                  className="mb-2.5 flex w-full cursor-pointer items-center gap-2.5 text-left"
                >
                  <ChevronRight
                    size={15}
                    strokeWidth={2.5}
                    className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
                    {SECTIE_LABEL[g.status]}
                  </span>
                  <span className="text-xs text-ink-muted">{g.opdrachten.length}</span>
                  <span className="h-0.5 flex-1 bg-line" />
                </button>
              ) : (
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
                    {SECTIE_LABEL[g.status]}
                  </span>
                  <span className="text-xs text-ink-muted">{g.opdrachten.length}</span>
                  <span className="h-0.5 flex-1 bg-line" />
                </div>
              )}
              {open && (
                <div className="flex flex-col gap-3">
                  {g.opdrachten.map((m) => (
                    <OpdrachtDashboardCard key={m.id} melding={m} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      <p className="mt-4 border-t border-dashed border-line pt-3 text-[12.5px] text-ink-muted">
        Opgeleverd en geannuleerd: alleen de laatste 14 dagen worden getoond. Ouder opzoeken? Tik het
        referentienummer in de zoekbalk.
      </p>
    </div>
  );
}
