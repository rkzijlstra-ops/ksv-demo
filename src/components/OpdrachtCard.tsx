import Link from "next/link";
import { ChevronRight, CalendarClock, CalendarPlus, Truck } from "lucide-react";
import type { Melding } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { opgeleverdBadgeConfig } from "@/lib/urgentie";
import { Badge } from "./Badge";
import { DocumenttypeBadge } from "./DocumenttypeBadge";

export function OpdrachtCard({
  melding,
  telling,
}: {
  melding: Melding;
  telling?: { aantal: number; heeftSpoed: boolean };
}) {
  const titel = melding.klant_naam ?? "Onbekende klant";
  const opgeleverd = melding.opdracht_status === "opgeleverd";
  const aantalOpen = telling?.aantal ?? 0;

  return (
    <Link
      href={`/opdracht/${melding.id}`}
      className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-lg font-bold text-ink">{titel}</span>
          {opgeleverd ? (
            <Badge config={opgeleverdBadgeConfig()} />
          ) : (
            telling?.heeftSpoed && (
              <Badge
                config={{ label: "Spoed", bg: "bg-urgent-rood", ink: "text-white", icon: "alert" }}
              />
            )
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DocumenttypeBadge type={melding.documenttype} />
          {melding.referentienummer && (
            <span className="text-sm font-semibold text-ink-muted">
              ref {melding.referentienummer}
            </span>
          )}
          {!opgeleverd && aantalOpen > 0 && (
            <Badge
              config={{
                label: `${aantalOpen} open`,
                bg: "bg-urgent-geel",
                ink: "text-ink",
                icon: "clock",
              }}
            />
          )}
        </div>

        {melding.klant_adres && (
          <p className="mt-1 truncate text-sm text-ink-muted">{melding.klant_adres}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <CalendarClock size={15} strokeWidth={2.5} aria-hidden="true" />
            {melding.uitvoerdatum ? formatDatumKort(melding.uitvoerdatum) : "Nog niet gepland"}
          </span>
          {melding.leverweek && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Truck size={15} strokeWidth={2} aria-hidden="true" />
              wk {melding.leverweek}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-ink-muted">
            <CalendarPlus size={15} strokeWidth={2} aria-hidden="true" />
            {formatDatumKort(melding.created_at)}
          </span>
        </div>
      </div>

      <ChevronRight size={24} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}
