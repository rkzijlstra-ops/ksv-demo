import Link from "next/link";
import { ChevronRight, CalendarClock, CalendarPlus, User, AlertTriangle } from "lucide-react";
import type { Melding, DashboardStatus } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { isActief } from "@/lib/opdracht-status";
import { planningTijd, duurLabel } from "@/lib/opdracht-weergave";
import { DocumenttypeBadge } from "./DocumenttypeBadge";
import { OpdrachtStatusBadge } from "./OpdrachtStatusBadge";
import { MailMonteurKnop } from "./MailMonteurKnop";

/** Kleur van de linker strip (8px) per status. Literal Tailwind-classes (JIT-veilig). */
const STRIP: Record<DashboardStatus, string> = {
  binnen: "bg-ink-muted",
  concept_gepland: "bg-accent",
  gepland: "bg-urgent-geel",
  bevestigd: "bg-bevestigd",
  opgeleverd: "bg-success",
  geannuleerd: "bg-line",
};

/** Een opdracht-kaart op het opdrachtgever-dashboard. */
export function OpdrachtDashboardCard({ melding }: { melding: Melding }) {
  const status = melding.dashboard_status;
  const titel = melding.klant_naam ?? "Onbekende klant";
  const geannuleerd = status === "geannuleerd";
  const gepland = status === "concept_gepland" || status === "gepland" || status === "bevestigd";
  const geenRef = isActief(status) && !melding.referentienummer;
  const nogTeVersturen = status === "concept_gepland" || melding.gewijzigd_te_versturen;

  const cardRand = nogTeVersturen ? "border-accent" : "border-ink";
  const stripClass = nogTeVersturen ? "bg-accent" : STRIP[status];

  return (
    <Link
      href={`/dashboard/opdracht/${melding.id}`}
      className={`relative flex min-h-[88px] cursor-pointer items-stretch gap-3 border-2 ${cardRand} bg-white pr-3 transition-colors duration-150 hover:brightness-[0.97] focus-visible:outline-3 focus-visible:outline-accent`}
    >
      <span aria-hidden className={`w-2 shrink-0 ${stripClass}`} />

      <div className="min-w-0 flex-1 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-lg font-extrabold tracking-tight ${
              geannuleerd ? "text-ink-muted line-through" : "text-ink"
            }`}
          >
            {titel}
          </span>
          {melding.referentienummer && (
            <span className="shrink-0 bg-surface px-1.5 py-0.5 font-mono text-xs font-bold text-ink">
              {melding.referentienummer}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DocumenttypeBadge type={melding.documenttype} />
          <OpdrachtStatusBadge status={status} />
          {melding.teruggemeld_at && (
            <span className="inline-flex items-center gap-1.5 border-[1.5px] border-ink bg-ink px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
              Teruggemeld
            </span>
          )}
          {geenRef && (
            <span className="inline-flex items-center gap-1.5 border-[1.5px] border-urgent-rood bg-urgent-rood px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
              <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />
              Geen ref
            </span>
          )}
          {melding.gewijzigd_te_versturen && status !== "concept_gepland" && (
            <span className="inline-flex items-center border-[1.5px] border-accent px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-accent">
              Gewijzigd
            </span>
          )}
          {nogTeVersturen && <MailMonteurKnop opdrachtId={melding.id} label />}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {gepland ? (
            <>
              <span className="inline-flex items-center gap-1 font-mono font-bold text-ink">
                <CalendarClock size={15} strokeWidth={2.5} aria-hidden="true" />
                {planningTijd(melding)}
              </span>
              {melding.startdatum && !melding.starttijd && <span>{duurLabel(melding.duur_dagen)}</span>}
              {melding.monteur_naam && (
                <span className="inline-flex items-center gap-1">
                  <User size={15} strokeWidth={2} aria-hidden="true" />
                  {melding.monteur_naam}
                </span>
              )}
            </>
          ) : status === "opgeleverd" ? (
            <>
              <span className="inline-flex items-center gap-1 font-mono font-bold text-ink">
                <CalendarClock size={15} strokeWidth={2.5} aria-hidden="true" />
                {formatDatumKort(melding.opgeleverd_at)}
              </span>
              {melding.rapport_url && <span>Rapport verstuurd</span>}
            </>
          ) : (
            <>
              {melding.klant_adres && <span className="truncate">{melding.klant_adres}</span>}
              <span className="inline-flex items-center gap-1 font-mono">
                <CalendarPlus size={15} strokeWidth={2} aria-hidden="true" />
                binnen {formatDatumKort(melding.created_at)}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight size={24} className="shrink-0 self-center text-ink-muted" aria-hidden="true" />
    </Link>
  );
}
