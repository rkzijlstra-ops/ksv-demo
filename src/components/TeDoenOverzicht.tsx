import { ListChecks } from "lucide-react";
import type { TeDoenTelling } from "@/lib/te-doen";
import type { StatusFilter } from "@/lib/dashboard-lijst";

/**
 * "Te doen"-overzicht bovenaan het dashboard: één plek die zegt wat er op de opdrachtgever wacht.
 * Klik op een tegel zet het statusfilter (aandacht toont alles; geen-ref valt op aan de rode tag).
 */
export function TeDoenOverzicht({
  telling,
  onKies,
}: {
  telling: TeDoenTelling;
  onKies: (filter: StatusFilter) => void;
}) {
  const tegels: { num: number; label: string; sub: string; pip: string; filter: StatusFilter }[] = [
    { num: telling.tePlannen, label: "Te plannen", sub: "binnen, nog inplannen", pip: "bg-ink-muted", filter: "binnen" },
    { num: telling.teVersturen, label: "Te versturen", sub: "concept + gewijzigd", pip: "bg-accent", filter: "concept_gepland" },
    { num: telling.nietBevestigd, label: "Niet bevestigd", sub: "verstuurd, geen ja", pip: "bg-urgent-geel", filter: "gepland" },
    { num: telling.aandacht, label: "Aandacht", sub: "geen referentienummer", pip: "bg-urgent-rood", filter: "alle" },
  ];

  return (
    <div className="border-2 border-ink bg-white">
      <div className="flex items-center gap-2 border-b-2 border-ink bg-surface px-3.5 py-3 text-xs font-extrabold uppercase tracking-[0.04em]">
        <ListChecks size={17} strokeWidth={2.3} aria-hidden="true" />
        Te doen
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {tegels.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onKies(t.filter)}
            className={`flex cursor-pointer flex-col gap-1.5 border-line p-3.5 text-left hover:bg-surface ${
              i < tegels.length - 1 ? "border-r" : ""
            } ${i < 2 ? "border-b sm:border-b-0" : ""}`}
          >
            <span className="flex items-center gap-2 text-2xl font-black leading-none">
              <span aria-hidden className={`h-3 w-3 ${t.pip}`} />
              {t.num}
            </span>
            <span className="text-[13px] font-extrabold">{t.label}</span>
            <span className="text-[11.5px] text-ink-muted">{t.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
