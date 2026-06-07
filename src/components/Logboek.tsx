import { History } from "lucide-react";
import type { Gebeurtenis } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";

const ACTIE_LABEL: Record<string, string> = {
  verwijderd: "Verwijderd",
  teruggemeld: "Teruggemeld aan kantoor",
  gewijzigd: "Gegevens gewijzigd",
  geannuleerd: "Geannuleerd",
};

const REDEN_LABEL: Record<string, string> = {
  klant_niet_thuis: "Klant niet thuis",
  werk_niet_afgerond: "Werk niet af te ronden",
  anders: "Anders",
};

/** Audit-logboek van een opdracht: wie deed wat wanneer. Alleen-lezen, voor kantoor. */
export function Logboek({ gebeurtenissen }: { gebeurtenissen: Gebeurtenis[] }) {
  if (gebeurtenissen.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
        <History size={14} strokeWidth={2.4} aria-hidden="true" /> Logboek ({gebeurtenissen.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {gebeurtenissen.map((g) => {
          const reden = typeof g.details?.reden === "string" ? g.details.reden : null;
          const toelichting = typeof g.details?.toelichting === "string" ? g.details.toelichting : null;
          return (
            <li key={g.id} className="border border-line bg-white p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-semibold text-ink">{ACTIE_LABEL[g.actie] ?? g.actie}</span>
                <span className="font-mono text-xs text-ink-muted">{formatDatumKort(g.created_at)}</span>
              </div>
              <div className="mt-0.5 text-ink-muted">
                door {g.door_naam ?? "onbekend"}
                {g.door_rol ? ` (${g.door_rol})` : ""}
              </div>
              {(reden || toelichting) && (
                <div className="mt-1 text-ink">
                  {reden && <span className="font-semibold">{REDEN_LABEL[reden] ?? reden}</span>}
                  {reden && toelichting ? " — " : ""}
                  {toelichting}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
