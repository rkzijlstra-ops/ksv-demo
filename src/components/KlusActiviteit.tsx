import { History } from "lucide-react";
import type { Gebeurtenis, RapportVerzending } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";

/**
 * Gecombineerde activiteit van een klus voor de monteur: het logboek (voltooid gemeld, teruggemeld,
 * heropend, akkoord) en de verzendingen (rapport naar klant/zaak), in één lijst, nieuwste boven.
 * Zo ziet de monteur een bevestiging van wat hij deed en wat er verstuurd is.
 */
const ACTIE_LABEL: Record<string, string> = {
  afgerond: "Voltooid gemeld",
  teruggemeld: "Niet doorgegaan (teruggemeld)",
  heropend: "Heropend",
  voltooid_akkoord: "Goedgekeurd door de opdrachtgever",
  geannuleerd: "Geannuleerd",
  gewijzigd: "Gegevens gewijzigd",
  verwijderd: "Verwijderd",
  ingeschoten: "Ingeschoten",
  gepland: "Ingepland",
  verzet: "Verzet",
  ontplannen: "Van planning gehaald",
  verstuurd: "Naar monteur verstuurd",
};

type Item = { id: string; when: string; titel: string; detail: string | null };

export function KlusActiviteit({
  gebeurtenissen,
  verzendingen,
}: {
  gebeurtenissen: Gebeurtenis[];
  verzendingen: RapportVerzending[];
}) {
  const items: Item[] = [];

  for (const g of gebeurtenissen) {
    const toelichting = typeof g.details?.toelichting === "string" ? g.details.toelichting : null;
    const detail = [g.door_naam ? `door ${g.door_naam}` : null, toelichting].filter(Boolean).join(" - ");
    items.push({
      id: `g-${g.id}`,
      when: g.created_at,
      titel: ACTIE_LABEL[g.actie] ?? g.actie,
      detail: detail || null,
    });
  }

  for (const v of verzendingen) {
    items.push({
      id: `v-${v.id}`,
      when: v.created_at,
      titel: `Rapport verstuurd naar ${v.doelgroep === "zaak" ? "de opdrachtgever" : "de klant"}`,
      detail: v.naar,
    });
  }

  if (items.length === 0) return null;
  items.sort((a, b) => (a.when < b.when ? 1 : -1)); // nieuwste boven

  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
        <History size={14} strokeWidth={2.4} aria-hidden="true" /> Activiteit ({items.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="border border-line bg-white p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-semibold text-ink">{it.titel}</span>
              <span className="font-mono text-xs text-ink-muted">{formatDatumKort(it.when)}</span>
            </div>
            {it.detail && <div className="mt-0.5 break-all text-ink-muted">{it.detail}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}
