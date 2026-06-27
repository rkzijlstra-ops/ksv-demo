import Link from "next/link";
import { Lock, Video, FileBarChart, Pencil } from "lucide-react";
import { FotoGalerij } from "@/components/FotoGalerij";
import { formatDatumKort } from "@/lib/datum";

type ReadOnlyMelding = {
  id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  foto_urls: string[];
  video_url: string | null;
  created_at: string;
};

/**
 * Alleen-lezen weergave van een al verstuurde oplevering voor een opdrachtgever-klus. Toont kort wat er
 * is gedaan (opsomming + meldingen) en het verstuurde rapport, zonder invoervelden of verstuurknoppen.
 * Het rapport mag voor een opdrachtgever-klus niet meer gewijzigd worden (zie oplever-toegang).
 */
export function OpleverReadOnly({
  meldingen,
  rapportUrl,
  verstuurdOp,
  magBijwerken = false,
  aanpassenHref,
}: {
  meldingen: ReadOnlyMelding[];
  rapportUrl: string | null;
  verstuurdOp: string | null;
  /** Mag deze gebruiker (de opleveraar) de oplevering toch nog bijwerken? */
  magBijwerken?: boolean;
  /** Waar de "Toch aanpassen"-knop heen gaat (zet de flow in bewerk-modus). */
  aanpassenHref?: string;
}) {
  const fotoAantal = meldingen.reduce((n, m) => n + m.foto_urls.length, 0);
  const heeftVideo = meldingen.some((m) => !!m.video_url?.trim());

  return (
    <div className="flex flex-col gap-6 border-2 border-t-0 border-line bg-white p-4">
      {/* Alleen-lezen lint */}
      <div className="flex items-center gap-2 border-2 border-line bg-surface px-3 py-2.5 text-sm font-bold text-ink">
        <Lock size={16} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
        {verstuurdOp
          ? `Al verstuurd op ${formatDatumKort(verstuurdOp)} aan de opdrachtgever, alleen-lezen.`
          : "Al verstuurd aan de opdrachtgever, alleen-lezen."}
      </div>

      {/* Opsomming van wat in dit rapport zit */}
      <dl className="text-sm">
        <div className="flex items-center justify-between border-b border-line py-2">
          <dt className="text-ink-muted">Meldingen</dt>
          <dd className="font-extrabold text-ink">{meldingen.length}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-line py-2">
          <dt className="text-ink-muted">Foto&apos;s</dt>
          <dd className="font-extrabold text-ink">{fotoAantal}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-line py-2">
          <dt className="text-ink-muted">Video</dt>
          <dd className={`font-extrabold ${heeftVideo ? "text-accent" : "text-ink-muted"}`}>
            {heeftVideo ? "Bijgevoegd" : "Geen"}
          </dd>
        </div>
      </dl>

      {/* Meldingen (read-only) */}
      {meldingen.length > 0 && (
        <ul className="flex flex-col gap-3">
          {meldingen.map((m) => (
            <li key={m.id} className="border border-line bg-white p-3">
              {m.spoed && (
                <span className="mb-1.5 inline-block border-[1.5px] border-urgent-rood bg-urgent-rood px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
                  Spoed
                </span>
              )}
              <p className="text-sm text-ink">{m.ruwe_tekst?.trim() || "(foto, geen tekst)"}</p>
              {m.foto_urls.length > 0 && (
                <div className="mt-3">
                  <FotoGalerij urls={m.foto_urls} />
                </div>
              )}
              {m.video_url && (
                <a
                  href={m.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <Video size={16} strokeWidth={2.2} aria-hidden="true" /> Video bij deze melding
                </a>
              )}
              <p className="mt-2 font-mono text-xs text-ink-muted">{formatDatumKort(m.created_at)}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Het verstuurde rapport openen */}
      {rapportUrl && (
        <a
          href={rapportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent"
        >
          <FileBarChart size={18} strokeWidth={2.5} aria-hidden="true" /> Rapport-PDF openen
        </a>
      )}

      {magBijwerken && aanpassenHref && (
        <div className="border-t-2 border-line pt-4">
          <Link
            href={aanpassenHref}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 border-2 border-ink px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Pencil size={18} strokeWidth={2.5} aria-hidden="true" /> Toch aanpassen
          </Link>
          <p className="mt-2 text-xs text-ink-muted">
            Iets vergeten? Pas de oplevering aan en lever opnieuw op. De opdrachtgever krijgt dan een nieuw rapport.
          </p>
        </div>
      )}
    </div>
  );
}
