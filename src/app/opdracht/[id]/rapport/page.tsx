import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, Video, Play } from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { FotoGalerij } from "@/components/FotoGalerij";

export const dynamic = "force-dynamic";

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

export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) notFound();
  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const oplevering = await dbi.getOpleveringVoorOpdracht(id);

  const opleverdatum = opdracht.opgeleverd_at ?? new Date().toISOString();
  const fotos = oplevering?.eindstaat_foto_urls ?? [];
  const ondertekend = Boolean(oplevering?.handtekening_url);
  const opmerking = oplevering?.opmerking?.trim() || null;

  const chips: string[] = [];
  if (opdracht.referentienummer) chips.push(`Ref ${opdracht.referentienummer}`);
  if (opdracht.leverweek) chips.push(`Leverweek ${opdracht.leverweek}`);
  if (opdracht.keukenzaak) chips.push(opdracht.keukenzaak);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      {/* briefhoofd + klantblok (ontwerp Document) */}
      <div className="border-2 border-line bg-white">
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-black tracking-tight text-ink">BKM</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                Keukenmontage
              </span>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-extrabold uppercase tracking-[0.12em] text-ink">
                Opleverrapport
              </p>
              <p className="text-xs text-ink-muted">{formatDatumKort(opleverdatum)}</p>
            </div>
          </div>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
        </div>
        <div className="px-5 pb-5 pt-4">
          <p className="text-2xl font-extrabold tracking-tight text-ink">
            {opdracht.klant_naam ?? "Onbekende klant"}
          </p>
          {opdracht.klant_adres && <p className="mt-0.5 text-ink-muted">{opdracht.klant_adres}</p>}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => (
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
        {ondertekend ? (
          <span className="inline-flex items-center gap-1 border border-success bg-success/10 px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-success">
            <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden="true" />
            Ondertekend door klant
          </span>
        ) : (
          <span className="border border-line bg-surface px-2 py-1 text-xs font-extrabold uppercase tracking-[0.04em] text-ink-muted">
            Niet ondertekend
          </span>
        )}
        {oplevering?.video_url ? (
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
          {fotos.length} {fotos.length === 1 ? "foto" : "foto's"}
        </span>
      </div>

      {opmerking && (
        <p className="mt-3 border border-line border-l-[3px] border-l-accent bg-surface px-4 py-3 font-[family-name:var(--font-body)] text-base italic text-[#334155]">
          {opmerking}
        </p>
      )}

      {oplevering?.video_url && (
        <a
          href={oplevering.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 border-2 border-primary px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Play size={16} strokeWidth={2.5} aria-hidden="true" />
          Video van de oplevering
        </a>
      )}

      <div className="mt-4">
        {fotos.length > 0 ? (
          <FotoGalerij urls={fotos} />
        ) : (
          <p className="border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen eindstaat-foto&apos;s bij deze oplevering.
          </p>
        )}
      </div>

      {ondertekend && (
        <div className="mt-4">
          <p className="mb-1 text-sm font-bold text-ink">Handtekening klant</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={oplevering!.handtekening_url!}
            alt="Handtekening klant"
            className="h-20 w-44 border border-line bg-white object-contain p-1"
          />
        </div>
      )}

      {/* sectie: Meldingen */}
      <SectieKop label={`Meldingen (${meldingen.length})`} kleur="ink" />

      {meldingen.length === 0 ? (
        <p className="border border-line bg-surface p-4 text-sm text-ink-muted">
          Geen meldingen op deze opdracht.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {meldingen.map((m) => (
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
                  <FotoGalerij urls={m.foto_urls} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* vaste onderbalk: terug naar versturen */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 py-3">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href={`/opdracht/${id}/opleveren`}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            Terug naar versturen
          </Link>
        </div>
      </div>
    </main>
  );
}
