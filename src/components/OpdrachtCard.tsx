import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import type { Melding } from "@/lib/db";
import { UrgentieBadge } from "./UrgentieBadge";
import { BronBadge } from "./BronBadge";

export function OpdrachtCard({ melding }: { melding: Melding }) {
  const titel = melding.klant_naam ?? "Onbekende klant";

  return (
    <Link
      href={`/opdracht/${melding.id}`}
      className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-lg font-bold text-ink">{titel}</span>
          <UrgentieBadge urgentie={melding.urgentie} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <BronBadge bron={melding.bron} />
          {melding.referentienummer && (
            <span className="text-sm font-semibold text-ink-muted">
              ref {melding.referentienummer}
            </span>
          )}
          {melding.status === "verzonden" && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              Verzonden{melding.aangepast ? " (aangepast)" : ""}
            </span>
          )}
        </div>

        {melding.klant_adres && (
          <p className="mt-1 truncate text-sm text-ink-muted">{melding.klant_adres}</p>
        )}
      </div>

      <ChevronRight size={24} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}
