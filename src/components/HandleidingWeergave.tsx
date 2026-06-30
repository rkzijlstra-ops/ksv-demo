"use client";

import { useMemo, useState } from "react";

export type OnderwerpView = {
  id: string;
  titel: string;
  intro?: string;
  punten: string[];
  bestand: string;
  nieuw?: boolean;
  bestaat: boolean;
};

export type GroepView = { titel: string; onderwerpen: OnderwerpView[] };

/**
 * Toont de handleiding als inklapbare onderwerpen in groepen. Standaard alles ingeklapt
 * (snel scannen); één knop klapt alles open/dicht, en losse onderwerpen kun je los aantikken.
 * Bewust geen verborgen browser-geheugen: het gedrag is altijd hetzelfde.
 */
export function HandleidingWeergave({ groepen }: { groepen: GroepView[] }) {
  const alleIds = useMemo(
    () => groepen.flatMap((g) => g.onderwerpen.map((o) => o.id)),
    [groepen],
  );
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const ietsOpen = openIds.size > 0;

  function wisselAlles() {
    setOpenIds(ietsOpen ? new Set() : new Set(alleIds));
  }
  function wisselEen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={wisselAlles}
        className="mb-5 flex min-h-[56px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-primary bg-primary px-4 py-2 text-primary-ink transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-3 focus-visible:outline-accent"
      >
        <span className="font-mono text-sm font-extrabold uppercase tracking-[0.05em]">
          {ietsOpen ? "Alles inklappen" : "Alles openklappen"}
        </span>
        {!ietsOpen && (
          <span className="text-xs font-semibold text-primary-ink/70">
            of tik hieronder een onderwerp aan
          </span>
        )}
      </button>

      {groepen.map((groep) => (
        <section key={groep.titel} className="mb-7">
          <h2 className="mb-2.5 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
            {groep.titel}
            <span aria-hidden className="h-0.5 flex-1 bg-line" />
          </h2>

          {groep.onderwerpen.map((o) => {
            const open = openIds.has(o.id);
            return (
              <div
                key={o.id}
                id={o.id}
                className={`mb-2.5 border-2 ${open ? "border-ink" : "border-line"} bg-white`}
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`paneel-${o.id}`}
                    onClick={() => wisselEen(o.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 border-l-[5px] ${open ? "border-l-accent" : "border-l-line"} bg-surface px-4 py-4 text-left focus-visible:outline-3 focus-visible:outline-accent`}
                  >
                    <span className="font-mono text-base font-extrabold tracking-tight text-ink">
                      {o.titel}
                    </span>
                    {o.nieuw && (
                      <span className="border-[1.5px] border-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-accent">
                        nieuw
                      </span>
                    )}
                    <span
                      aria-hidden
                      className={`ml-auto text-lg text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}
                    >
                      ›
                    </span>
                  </button>
                </h3>

                {open && (
                  <div id={`paneel-${o.id}`} className="px-4 pb-4 pt-3.5">
                    {o.intro && <p className="mb-2 text-sm text-ink">{o.intro}</p>}
                    {o.punten.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                        {o.punten.map((punt) => (
                          <li key={punt}>{punt}</li>
                        ))}
                      </ul>
                    )}

                    {o.bestaat ? (
                      <div className="mx-auto mt-3.5 w-full max-w-[260px] overflow-hidden rounded-[26px] border-8 border-ink bg-ink">
                        {/* Volledige schermafbeelding op natuurlijke verhouding: zo komt het plaatje
                            exact overeen met het echte scherm (geen bijsnijden/uitzoomen). */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/handleiding/${o.bestand}`}
                          alt={`Schermafbeelding: ${o.titel}`}
                          className="block h-auto w-full"
                        />
                      </div>
                    ) : (
                      <div className="mt-3.5 flex min-h-[120px] items-center justify-center border border-dashed border-line bg-surface p-5 text-center text-xs text-ink-muted">
                        Schermafbeelding volgt.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
