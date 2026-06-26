import Image from "next/image";
import { Video } from "lucide-react";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { meldingMediaTelling } from "@/lib/melding-overzicht";

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
 * Compacte rij per melding: thumbnail(s) + tekst (max 2 regels) + een korte foto/video-telling; alleen
 * spoed krijgt een label. Zo ziet de monteur in één oogopslag wat de opdrachtgever krijgt, zonder dat
 * het lang wordt. Geen bewerk-/verwijder-knoppen.
 */
export function MeldingenOverzicht({ meldingen }: { meldingen: OverzichtMelding[] }) {
  return (
    <section>
      <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
        Dit gaat mee in het rapport ({meldingen.length})
      </h2>
      <p className="mb-3 mt-1 text-sm text-ink-muted">Zo ziet de opdrachtgever het.</p>

      {meldingen.length === 0 ? (
        <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
          Geen meldingen op deze klus. Het rapport gaat dan met alleen je begeleidend bericht mee.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {meldingen.map((m) => {
            const telling = meldingMediaTelling(m.foto_urls.length, Boolean(m.video_url));
            const thumbs = m.foto_urls.slice(0, 2);
            return (
              <li key={m.id} className="flex gap-3 rounded-none border border-line bg-white p-2">
                {/* Thumbnails (max 2, licht gestapeld). Geen foto maar wel video: een video-tegel. */}
                {thumbs.length > 0 ? (
                  <div className="flex shrink-0">
                    {thumbs.map((url, i) => (
                      <div
                        key={url}
                        className={`relative h-12 w-12 shrink-0 overflow-hidden border border-line bg-surface ${i > 0 ? "-ml-3.5" : ""}`}
                      >
                        <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                ) : m.video_url ? (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-ink text-white">
                    <Video size={20} strokeWidth={2.5} aria-hidden="true" />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  {m.spoed && (
                    <div className="mb-0.5">
                      <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
                    </div>
                  )}
                  {m.ruwe_tekst ? (
                    <p className="line-clamp-2 font-[family-name:var(--font-body)] text-base text-ink">
                      {m.ruwe_tekst}
                    </p>
                  ) : (
                    <p className="text-base italic text-ink-muted">Geen omschrijving</p>
                  )}
                  {telling && <p className="mt-0.5 text-xs font-semibold text-ink-muted">{telling}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
