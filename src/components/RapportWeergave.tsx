import { CheckCircle2, XCircle, Video, Play, Lock } from "lucide-react";
import { formatDatumKort } from "@/lib/datum";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { FotoGalerij } from "@/components/FotoGalerij";

// Gegevens van één melding die in het rapport getoond worden.
export type RapportMelding = {
  id: string;
  spoed: boolean;
  spoed_verzonden_at: string | null;
  created_at: string;
  ruwe_tekst: string | null;
  foto_urls: string[];
};

// Alle data die de rapport-weergave nodig heeft, los van de DB.
export type RapportWeergaveData = {
  afzenderKop: string;
  opleverdatum: string;
  klantNaam: string;
  klantAdres: string | null;
  chips: string[];
  ondertekend: boolean;
  handtekeningUrl: string | null;
  videoUrl: string | null;
  fotos: string[];
  opmerking: string | null;
  /** Controle-checklist die de klant aftekende (akkoord/niet akkoord per punt). */
  controle: { punt: string; akkoord: boolean }[];
  /** Interne notitie: alleen in de versie voor de opdrachtgever, nooit in de klant-versie. */
  interneNotitie: string | null;
  meldingen: RapportMelding[];
};

// Sectionskopje: kleur-blokje + tekst + dunne lijn.
function SectieKop({ label, kleur }: { label: string; kleur: "accent" | "ink" }) {
  return (
    <div className="mt-7 mb-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-2.5 w-2.5 ${kleur === "accent" ? "bg-accent" : "bg-ink"}`} />
        <h2 className="font-mono text-sm font-extrabold uppercase tracking-[0.07em] text-ink">{label}</h2>
      </div>
      <div className="mt-2 h-px bg-line" />
    </div>
  );
}

/**
 * Puur presentationeel rapport-lichaam. Geen DB, geen async, geen datum-aanroepen.
 * Wordt zowel door de echte rapport-pagina als de demo-pagina gebruikt.
 * De <main>-wrapper en de vaste onderbalk zitten bij de pagina, niet hier.
 */
export function RapportWeergave({ data }: { data: RapportWeergaveData }) {
  // Doorlopende foto-nummering (zelfde reeks als de PDF): oplevering eerst (1..n), dan de meldingen.
  const meldingFotoStart: number[] = [];
  {
    let acc = data.fotos.length + 1;
    for (const m of data.meldingen) {
      meldingFotoStart.push(acc);
      acc += m.foto_urls.length;
    }
  }

  return (
    <>
      {/* briefhoofd + klantblok (ontwerp Document) */}
      <div className="border-2 border-line bg-white">
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xl font-black tracking-tight text-ink">{data.afzenderKop}</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
                Opleverrapport
              </p>
              <p className="text-xs text-ink-muted">{formatDatumKort(data.opleverdatum)}</p>
            </div>
          </div>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
        </div>
        <div className="px-5 pb-5 pt-4">
          <p className="text-2xl font-extrabold tracking-tight text-ink">{data.klantNaam}</p>
          {data.klantAdres && <p className="mt-0.5 text-ink-muted">{data.klantAdres}</p>}
          {data.chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.chips.map((c) => (
                <span
                  key={c}
                  className="border border-line bg-surface px-2 py-0.5 text-xs font-bold text-ink"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* sectie: Oplevering / rapportage */}
      <SectieKop label="Oplevering / rapportage" kleur="accent" />

      <div className="flex flex-wrap gap-2">
        {data.ondertekend ? (
          <span className="inline-flex items-center gap-1 border border-success bg-success/10 px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-success">
            <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
            Ondertekend door klant
          </span>
        ) : (
          <span className="border border-line bg-surface px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-ink-muted">
            Niet ondertekend
          </span>
        )}
        {data.videoUrl ? (
          <span className="inline-flex items-center gap-1 border border-accent bg-accent/10 px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-accent">
            <Video size={14} strokeWidth={2.5} aria-hidden="true" />
            Video bijgevoegd
          </span>
        ) : (
          <span className="border border-line bg-surface px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-ink-muted">
            Geen video
          </span>
        )}
        <span className="border border-accent bg-accent/10 px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-accent">
          {data.fotos.length} {data.fotos.length === 1 ? "foto" : "foto's"}
        </span>
      </div>

      {data.opmerking && (
        <p className="mt-3 border border-line border-l-[3px] border-l-accent bg-surface px-4 py-3 font-[family-name:var(--font-body)] text-base italic text-[#334155]">
          {data.opmerking}
        </p>
      )}

      {data.interneNotitie && (
        <div className="mt-3 border-2 border-urgent-geel bg-urgent-geel/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.04em] text-ink">
            <Lock size={13} strokeWidth={2.5} aria-hidden="true" />
            Intern: alleen voor de opdrachtgever
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-base text-ink">{data.interneNotitie}</p>
        </div>
      )}

      {data.videoUrl && (
        <a
          href={data.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 border-2 border-primary px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Play size={16} strokeWidth={2.5} aria-hidden="true" />
          Video van de oplevering
        </a>
      )}

      <div className="mt-4">
        {data.fotos.length > 0 ? (
          <FotoGalerij urls={data.fotos} startNummer={1} />
        ) : (
          <p className="border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen eindstaat-foto&apos;s bij deze oplevering.
          </p>
        )}
      </div>

      {data.ondertekend && data.handtekeningUrl && (
        <div className="mt-4">
          <p className="mb-1 text-sm font-bold text-ink">Handtekening klant</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.handtekeningUrl}
            alt="Handtekening klant"
            className="h-20 w-44 border border-line bg-white object-contain p-1"
          />
        </div>
      )}

      {/* sectie: Controle bij oplevering (de afgetekende checklist, zoals in de PDF) */}
      {data.controle.length > 0 && (
        <>
          <SectieKop label="Controle bij oplevering" kleur="accent" />
          <ul className="flex flex-col gap-1.5">
            {data.controle.map((c, i) => (
              <li key={i} className="flex items-start gap-2 border border-line bg-white px-3 py-2 text-sm">
                {c.akkoord ? (
                  <CheckCircle2 size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <XCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-urgent-rood" aria-hidden="true" />
                )}
                <span className="flex-1 text-ink">{c.punt}</span>
                {!c.akkoord && (
                  <span className="shrink-0 text-xs font-extrabold uppercase tracking-[0.04em] text-urgent-rood">
                    niet akkoord
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* sectie: Meldingen */}
      <SectieKop label={`Meldingen (${data.meldingen.length})`} kleur="ink" />

      {data.meldingen.length === 0 ? (
        <p className="border border-line bg-surface p-4 text-sm text-ink-muted">
          Geen meldingen op deze klus.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.meldingen.map((m, mi) => (
            <li key={m.id} className="border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
                <span className="font-mono text-xs text-ink-muted">{formatDatumKort(m.created_at)}</span>
              </div>
              {m.spoed && m.spoed_verzonden_at && (
                <p className="mt-1 text-xs font-semibold text-urgent-rood">
                  Al als spoed verstuurd op {formatDatumKort(m.spoed_verzonden_at)}
                </p>
              )}
              {m.ruwe_tekst && (
                <p className="mt-2 font-[family-name:var(--font-body)] text-base text-ink">
                  {m.ruwe_tekst}
                </p>
              )}
              {m.foto_urls.length > 0 && (
                <div className="mt-3">
                  <FotoGalerij urls={m.foto_urls} startNummer={meldingFotoStart[mi]} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
