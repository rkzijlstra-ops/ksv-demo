"use client";

import { useMemo, useState } from "react";
import { Download, Check, TriangleAlert } from "lucide-react";
import { formatDatumKort } from "@/lib/datum";
import type { FotoGroep } from "@/lib/rapport-indeling";

const BLAUW = "#335775";

/**
 * Publieke foto-downloadpagina in rapport-stijl. De opdrachtgever kan foto's aanvinken en losse of alle
 * foto's als zip downloaden (volle resolutie). Meldingen (met tekst) staan bovenaan, dan de eindstaat.
 */
export function FotoDownloadClient({
  id,
  klantNaam,
  opleverdatum,
  groepen,
}: {
  id: string;
  klantNaam: string;
  opleverdatum: string;
  groepen: FotoGroep[];
}) {
  const alleIndexen = useMemo(() => groepen.flatMap((g) => g.fotos.map((f) => f.index)), [groepen]);
  const totaal = alleIndexen.length;
  const [gekozen, setGekozen] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setGekozen((huidig) => {
      const volgend = new Set(huidig);
      if (volgend.has(index)) volgend.delete(index);
      else volgend.add(index);
      return volgend;
    });
  }

  function downloadAlles() {
    window.location.href = `/api/klus/${id}/fotos/zip`;
  }
  function downloadSelectie() {
    if (gekozen.size === 0) return;
    const sel = alleIndexen.filter((i) => gekozen.has(i)).join(",");
    window.location.href = `/api/klus/${id}/fotos/zip?sel=${sel}`;
  }

  if (totaal === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <p className="border border-line bg-surface p-4 text-ink-muted">
          Er zijn geen foto&apos;s bij deze oplevering.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-16">
      {/* sticky actiebalk */}
      <div className="sticky top-0 z-10 border-b border-line bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-auto min-w-0">
            <p className="font-mono text-xs font-extrabold uppercase tracking-[0.1em]" style={{ color: BLAUW }}>
              Foto&apos;s downloaden
            </p>
            <p className="truncate text-sm text-ink-muted">
              {klantNaam} · opgeleverd {formatDatumKort(opleverdatum)} · {totaal} foto&apos;s, volle resolutie
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSelectie}
            disabled={gekozen.size === 0}
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-primary bg-white px-4 text-sm font-extrabold text-primary hover:bg-surface disabled:cursor-default disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-accent"
          >
            Download selectie ({gekozen.size})
          </button>
          <button
            type="button"
            onClick={downloadAlles}
            className="inline-flex min-h-[44px] items-center gap-2 bg-primary px-4 text-sm font-extrabold text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Download size={16} strokeWidth={2.5} aria-hidden="true" />
            Download alles
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pb-3 text-sm">
          <button type="button" onClick={() => setGekozen(new Set(alleIndexen))} className="font-semibold text-[#335775] hover:underline">
            Alles selecteren
          </button>
          <button type="button" onClick={() => setGekozen(new Set())} className="font-semibold text-[#335775] hover:underline">
            Selectie wissen
          </button>
          <span className="text-ink-muted">{gekozen.size} van {totaal} geselecteerd</span>
        </div>
      </div>

      {/* briefhoofd, zoals het rapport */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-6">
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-4">
          <div className="flex min-w-0 items-stretch gap-3">
            <span aria-hidden className="w-1 shrink-0" style={{ backgroundColor: BLAUW }} />
            <div className="min-w-0">
              <p className="font-mono text-lg font-black tracking-tight text-ink">Foto&apos;s bij oplevering</p>
              <p className="font-mono text-xs font-extrabold uppercase tracking-[0.12em]" style={{ color: BLAUW }}>
                {klantNaam}
              </p>
            </div>
          </div>
        </div>

        {groepen.map((g, gi) => (
          <section key={gi} className="mt-7">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs font-extrabold leading-none text-white"
                style={{ backgroundColor: BLAUW }}
              >
                {gi + 1}
              </span>
              <h2 className="font-mono text-sm font-extrabold uppercase tracking-[0.07em] text-ink">
                {g.soort === "eindstaat" ? `Eindstaat-foto's (${g.fotos.length})` : g.spoed ? "Spoedmelding" : "Melding"}
              </h2>
            </div>
            <div className="mt-2 h-[2px] bg-ink" />

            {g.soort === "melding" && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  {g.spoed ? (
                    <span className="inline-flex items-center gap-1 border border-urgent-rood bg-urgent-rood/10 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.04em] text-urgent-rood">
                      <TriangleAlert size={12} strokeWidth={2.5} aria-hidden="true" />
                      Spoed
                    </span>
                  ) : (
                    <span className="inline-flex items-center border border-accent/60 bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.04em] text-[#c2410c]">
                      Melding
                    </span>
                  )}
                  <span className="font-mono text-xs text-ink-muted">{formatDatumKort(g.datum)}</span>
                </div>
                {g.tekst && <p className="mt-2 font-[family-name:var(--font-body)] text-base text-ink">{g.tekst}</p>}
              </div>
            )}

            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.fotos.map((f) => {
                const aan = gekozen.has(f.index);
                return (
                  <li key={f.index}>
                    <button
                      type="button"
                      onClick={() => toggle(f.index)}
                      aria-pressed={aan}
                      className={`group relative block w-full overflow-hidden border-2 focus-visible:outline-3 focus-visible:outline-accent ${
                        aan ? "border-[#335775] ring-2 ring-[#335775]/25" : "border-line"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={`Foto ${f.nr}`} className="aspect-[4/3] w-full object-cover" />
                      <span
                        className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 border-white ${
                          aan ? "bg-[#335775] text-white" : "bg-black/25 text-transparent"
                        }`}
                      >
                        <Check size={15} strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="absolute right-0 top-0 bg-ink px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {f.nr}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
