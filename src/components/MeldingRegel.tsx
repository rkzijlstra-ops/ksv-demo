import Link from "next/link";
import { ChevronRight, Pencil, Video, Image as ImageIcon } from "lucide-react";
import { FotoGalerij } from "@/components/FotoGalerij";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { MeldingVerwijderKnop } from "@/components/MeldingVerwijderKnop";
import { formatDatumKort } from "@/lib/datum";

type RegelMelding = {
  id: string;
  spoed: boolean;
  spoed_verzonden_at: string | null;
  ruwe_tekst: string | null;
  foto_urls: string[];
  video_url: string | null;
  created_at: string;
  versie: number;
};

/**
 * Eén melding als inklapbare regel (dicht als standaard, klik om te openen). Native <details>, geen JS.
 * readOnly = vorige ronde: alleen lezen, geen Bewerken/Verwijderen.
 */
export function MeldingRegel({
  melding: m,
  opdrachtId,
  readOnly = false,
}: {
  melding: RegelMelding;
  opdrachtId: string;
  readOnly?: boolean;
}) {
  const fotoN = m.foto_urls.length;
  return (
    <details className="group rounded-none border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-surface [&::-webkit-details-marker]:hidden">
        {m.spoed ? (
          <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
        ) : (
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink-muted" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {m.ruwe_tekst?.trim() || "(foto, geen tekst)"}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
          {fotoN > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon size={13} strokeWidth={2.2} aria-hidden="true" />
              {fotoN}
            </span>
          )}
          {m.video_url && <Video size={13} strokeWidth={2.2} aria-hidden="true" />}
          <span className="font-mono">{formatDatumKort(m.created_at)}</span>
        </span>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-90"
        />
      </summary>

      <div className="border-t border-line p-3">
        {m.versie > 1 && (
          <p className="mb-1 text-sm font-semibold text-ink-muted">aangepast (v{m.versie})</p>
        )}
        {m.spoed && m.spoed_verzonden_at && (
          <p className="mb-1 text-xs font-semibold text-urgent-rood">
            Spoed verstuurd op {formatDatumKort(m.spoed_verzonden_at)}
          </p>
        )}
        {m.ruwe_tekst && (
          <p className="font-[family-name:var(--font-body)] text-base text-ink">{m.ruwe_tekst}</p>
        )}
        {fotoN > 0 && (
          <div className="mt-3">
            <FotoGalerij urls={m.foto_urls} />
          </div>
        )}
        {m.video_url && (
          <a
            href={m.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-accent"
          >
            <Video size={16} strokeWidth={2.2} aria-hidden="true" /> Video bij deze melding
          </a>
        )}
        {!readOnly && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Link
              href={`/opdracht/${opdrachtId}/melding/${m.id}`}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1 border border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
            >
              <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
              Bewerken
            </Link>
            <MeldingVerwijderKnop meldingId={m.id} />
          </div>
        )}
      </div>
    </details>
  );
}
