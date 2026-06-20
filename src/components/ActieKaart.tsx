import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode, MouseEvent } from "react";

/**
 * Eén kaart-vorm voor klikbare acties/keuzes in de monteur-flow (handtekening, rapport voorvertonen,
 * versturen-doelen, afsluit-keuzes). Linker accent-streep + icoon-cirkel dragen de betekenis via de
 * kleur-taal: neutraal (grijs) = optioneel/secundair, actie (oranje) = nog te doen, klaar (groen) =
 * gedaan/verzonden, negatief (rood) = afwijkende keuze. Rechte hoeken, dikke rand, 56px hoog.
 */
export type KaartAccent = "neutraal" | "actie" | "klaar" | "negatief";

const ACCENT: Record<KaartAccent, { streep: string; cirkel: string; sub: string }> = {
  neutraal: { streep: "bg-ink-muted", cirkel: "bg-ink-muted/10 text-ink-muted", sub: "text-ink-muted" },
  actie: { streep: "bg-accent", cirkel: "bg-accent/15 text-accent", sub: "text-accent" },
  klaar: { streep: "bg-success", cirkel: "bg-success/15 text-success", sub: "text-success" },
  negatief: { streep: "bg-urgent-rood", cirkel: "bg-urgent-rood/15 text-urgent-rood", sub: "text-urgent-rood" },
};

export function ActieKaart({
  icoon,
  titel,
  sub,
  accent = "neutraal",
  subAccent = false,
  href,
  onClick,
  ariaLabel,
}: {
  /** Lucide-icoon (met eigen size), getoond in de cirkel. */
  icoon: ReactNode;
  titel: string;
  /** Subtekst onder de titel (bv. status of toelichting). */
  sub?: ReactNode;
  accent?: KaartAccent;
  /** Subtekst in de accent-kleur tonen (bv. statuskleur bij versturen). */
  subAccent?: boolean;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  ariaLabel?: string;
}) {
  const a = ACCENT[accent];
  const buiten =
    "group flex min-h-[56px] cursor-pointer items-stretch border-2 border-line bg-white text-left hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent";

  const inhoud = (
    <>
      <span aria-hidden className={`w-1.5 shrink-0 ${a.streep}`} />
      <span className="flex flex-1 items-center gap-3 px-3 py-2.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${a.cirkel}`}>
          {icoon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-base font-extrabold text-ink">{titel}</span>
          {sub != null && (
            <span className={`mt-0.5 block text-sm ${subAccent ? a.sub : "text-ink-muted"}`}>{sub}</span>
          )}
        </span>
        <ChevronRight size={20} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={buiten}>
        {inhoud}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${buiten} w-full`}>
      {inhoud}
    </button>
  );
}
