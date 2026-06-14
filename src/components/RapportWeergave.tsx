import { Play, Lock, PenLine } from "lucide-react";
import { formatDatumKort } from "@/lib/datum";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { FotoGalerij } from "@/components/FotoGalerij";

// Kleuren overgenomen van de PDF-generator (rapport.ts) zodat de preview hetzelfde oogt: blauw accent.
const BLAUW = "#335775";

// Gegevens van één melding die in het rapport getoond worden.
export type RapportMelding = {
  id: string;
  spoed: boolean;
  spoed_verzonden_at: string | null;
  created_at: string;
  ruwe_tekst: string | null;
  foto_urls: string[];
};

// Alle data die de rapport-weergave nodig heeft, los van de DB. Volgt de PDF (rapport.ts).
export type RapportWeergaveData = {
  afzenderKop: string;
  afzenderVoet: string | null;
  opleverdatum: string;
  klantNaam: string;
  klantAdres: string | null;
  referentienummer: string | null;
  leverweek: string | null;
  keukenzaak: string | null;
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

// Genummerd sectiekopje: blauw vierkantje met wit cijfer + titel + lijn (zoals in de PDF).
function SectieKop({ nr, titel }: { nr: number; titel: string }) {
  return (
    <div className="mt-7 mb-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs font-extrabold leading-none text-white"
          style={{ backgroundColor: BLAUW }}
        >
          {nr}
        </span>
        <h2 className="font-mono text-sm font-extrabold uppercase tracking-[0.07em] text-ink">{titel}</h2>
      </div>
      <div className="mt-2 h-[2px] bg-ink" />
    </div>
  );
}

// Overzicht-regel: label links, stippel-leader, waarde rechts in kleur (zoals in de PDF).
function LeaderRegel({ label, waarde, kleur }: { label: string; waarde: string; kleur: string }) {
  return (
    <div className="flex items-baseline gap-1 text-sm">
      <span className="shrink-0 text-ink">{label}</span>
      <span aria-hidden className="mx-1 -mb-0.5 min-w-4 flex-1 border-b border-dotted border-line" />
      <span className={`shrink-0 font-bold ${kleur}`}>{waarde}</span>
    </div>
  );
}

/**
 * Puur presentationeel rapport-lichaam dat het echte opleverrapport (de PDF, rapport.ts) volgt:
 * blauw accent, genummerde secties, een overzicht in sectie 1, controle-checklist, en de
 * handtekening onderaan. Geen DB, geen async. Wordt gebruikt door de voorvertonen-pagina én het
 * voorbeeldrapport in de handleiding, zodat beide tonen wat de monteur echt verstuurt.
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

  const controleNietAkkoord = data.controle.filter((c) => !c.akkoord).length;
  const heeftControle = data.controle.length > 0;
  const heeftBijlagen = data.fotos.length > 0 || Boolean(data.videoUrl);
  // Sectienummers: Oplevering=1, Meldingen=2, daarna Controle en Bijlagen voor zover aanwezig.
  const nrControle = 3;
  const nrBijlagen = heeftControle ? 4 : 3;

  const tabel: [string, string][] = [];
  if (data.referentienummer) tabel.push(["Referentienummer", data.referentienummer]);
  if (data.leverweek) tabel.push(["Leverweek", data.leverweek]);
  if (data.keukenzaak) tabel.push(["Keukenzaak", data.keukenzaak]);

  return (
    <div className="bg-white">
      {/* briefhoofd: blauwe accentbalk + bedrijfsnaam links, documentlabel + datum rechts */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-4">
        <div className="flex min-w-0 items-stretch gap-3">
          <span aria-hidden className="w-1 shrink-0" style={{ backgroundColor: BLAUW }} />
          <div className="min-w-0">
            <p className="font-mono text-xl font-black tracking-tight text-ink">{data.afzenderKop}</p>
            <p className="font-mono text-xs font-extrabold uppercase tracking-[0.12em]" style={{ color: BLAUW }}>
              Opleverrapport
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-ink">{formatDatumKort(data.opleverdatum)}</p>
          <p className="text-xs text-ink-muted">Opgeleverd op</p>
        </div>
      </div>

      {/* klant-gegevens */}
      <div className="mt-4">
        <p className="text-2xl font-extrabold tracking-tight text-ink">{data.klantNaam}</p>
        {data.klantAdres && <p className="mt-0.5 text-ink-muted">{data.klantAdres}</p>}
        {tabel.length > 0 && (
          <dl className="mt-3 flex flex-col gap-1">
            {tabel.map(([label, waarde]) => (
              <div key={label} className="flex items-baseline gap-1 text-sm">
                <dt className="shrink-0 text-ink-muted">{label}</dt>
                <span aria-hidden className="mx-1 -mb-0.5 min-w-4 flex-1 border-b border-dotted border-line" />
                <dd className="shrink-0 font-semibold text-ink">{waarde}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* sectie 1: Oplevering — overzicht + opmerking + interne notitie + eindstaat-foto's */}
      <SectieKop nr={1} titel="Oplevering" />
      <div className="flex flex-col gap-1.5">
        <LeaderRegel
          label="Ondertekend door klant"
          waarde={data.ondertekend ? "Ja" : "Nee"}
          kleur={data.ondertekend ? "text-success" : "text-ink-muted"}
        />
        <LeaderRegel
          label="Video van de oplevering"
          waarde={data.videoUrl ? "Bijgevoegd" : "Geen"}
          kleur={data.videoUrl ? "text-[#335775]" : "text-ink-muted"}
        />
        <LeaderRegel label="Eindstaat-foto's" waarde={String(data.fotos.length)} kleur="text-ink" />
        {heeftControle && (
          <LeaderRegel
            label="Controle bij oplevering"
            waarde={controleNietAkkoord === 0 ? "Akkoord" : `${controleNietAkkoord} niet akkoord`}
            kleur={controleNietAkkoord === 0 ? "text-success" : "text-urgent-rood"}
          />
        )}
      </div>

      {data.opmerking && (
        <p
          className="mt-3 border border-line bg-surface px-4 py-3 font-[family-name:var(--font-body)] text-base italic text-[#334155]"
          style={{ borderLeftWidth: 3, borderLeftColor: BLAUW }}
        >
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

      <div className="mt-4">
        {data.fotos.length > 0 ? (
          <>
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
              Eindstaat-foto&apos;s
            </p>
            <FotoGalerij urls={data.fotos} startNummer={1} />
          </>
        ) : (
          <p className="border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen eindstaat-foto&apos;s bij deze oplevering.
          </p>
        )}
      </div>

      {/* sectie 2: Meldingen */}
      <SectieKop nr={2} titel={`Meldingen (${data.meldingen.length})`} />
      {data.meldingen.length === 0 ? (
        <p className="border border-line bg-surface p-4 text-sm text-ink-muted">Geen meldingen op deze klus.</p>
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
                <p className="mt-2 font-[family-name:var(--font-body)] text-base text-ink">{m.ruwe_tekst}</p>
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

      {/* sectie 3: Controle bij oplevering (de afgetekende checklist) */}
      {heeftControle && (
        <>
          <SectieKop nr={nrControle} titel="Controle bij oplevering" />
          <ul className="flex flex-col gap-1.5">
            {data.controle.map((c, i) => (
              <li key={i} className="flex items-start gap-2 border border-line bg-white px-3 py-2 text-sm">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[11px] font-extrabold ${
                    c.akkoord ? "border-success text-success" : "border-urgent-rood text-urgent-rood"
                  }`}
                >
                  {c.akkoord ? "✓" : "✕"}
                </span>
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

      {/* sectie Bijlagen: video-link (de foto's hierboven zijn zelf aanklikbaar) */}
      {heeftBijlagen && (
        <>
          <SectieKop nr={nrBijlagen} titel="Bijlagen" />
          <p className="text-sm text-ink-muted">
            Tik een foto aan om hem groot te openen, op te slaan en zelf door te sturen.
          </p>
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
        </>
      )}

      {/* handtekening onderaan */}
      {data.ondertekend && data.handtekeningUrl && (
        <div className="mt-7">
          <p className="mb-1 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
            <PenLine size={13} strokeWidth={2.5} aria-hidden="true" />
            Handtekening klant
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.handtekeningUrl}
            alt="Handtekening klant"
            className="h-20 w-44 border border-line bg-white object-contain p-1"
          />
        </div>
      )}

      {/* voetregel: afzender-contactgegevens */}
      {data.afzenderVoet && (
        <p className="mt-7 border-t border-line pt-3 text-center text-xs text-ink-muted">{data.afzenderVoet}</p>
      )}
    </div>
  );
}
