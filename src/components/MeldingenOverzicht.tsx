import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { meldingMediaTelling } from "@/lib/melding-overzicht";
import { formatDatumKort } from "@/lib/datum";

export type OverzichtMelding = {
  id: string;
  spoed: boolean;
  spoed_verzonden_at: string | null;
  ruwe_tekst: string | null;
  foto_urls: string[];
  video_url: string | null;
  created_at: string;
};

/**
 * Read-only overzicht van de meldingen die met het rapport meegaan ("Dit gaat mee in het rapport").
 * Toont per melding de tekst + een korte foto/video-telling; alleen spoed krijgt een label. Geen
 * bewerk-/verwijder-knoppen: het laat de monteur zien wat de opdrachtgever krijgt, niets meer.
 */
export function MeldingenOverzicht({ meldingen }: { meldingen: OverzichtMelding[] }) {
  return (
    <section>
      <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
        Dit gaat mee in het rapport ({meldingen.length})
      </h2>
      <p className="mb-3 mt-1 text-sm text-ink-muted">Dit ziet de opdrachtgever in het rapport.</p>

      {meldingen.length === 0 ? (
        <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
          Geen meldingen op deze klus. Het rapport gaat dan zonder meldingen mee.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {meldingen.map((m) => {
            const telling = meldingMediaTelling(m.foto_urls.length, Boolean(m.video_url));
            return (
              <li key={m.id} className="rounded-none border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  {m.spoed ? (
                    <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
                  ) : (
                    <span aria-hidden />
                  )}
                  <span className="font-mono text-xs text-ink-muted">{formatDatumKort(m.created_at)}</span>
                </div>
                {m.ruwe_tekst && (
                  <p className="mt-2 font-[family-name:var(--font-body)] text-base text-ink">{m.ruwe_tekst}</p>
                )}
                {telling && <p className="mt-2 text-sm font-semibold text-ink-muted">{telling}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
