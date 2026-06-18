import Link from "next/link";
import { ChevronRight, CalendarClock, CalendarPlus, Truck } from "lucide-react";
import type { Melding } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { uitvoerdatumVoorMonteur } from "@/lib/opdracht-status";
import { afrondStatus, afrondStatusLabel } from "@/lib/afrond-status";
import { opgeleverdBadgeConfig, bevestigBadgeConfig } from "@/lib/urgentie";
import { redenLabel } from "@/lib/terugmeld-mail";
import { Badge } from "./Badge";
import { DocumenttypeBadge } from "./DocumenttypeBadge";
import { OpdrachtVerwijderIcoon } from "./OpdrachtVerwijderIcoon";
import { BevestigKaartKnop } from "./BevestigKaartKnop";
import { TerugmeldKnop } from "./TerugmeldKnop";

export function OpdrachtCard({
  melding,
  telling,
  magVerwijderen = true,
  magTerugmelden = false,
  rapportNietVerzonden = false,
  vervolg = false,
}: {
  melding: Melding;
  telling?: { aantal: number; heeftSpoed: boolean };
  /** Prullenbakje tonen? Alleen bij een eigen ingeschoten klus (of kantoor); Ed's klus = terugmelden. */
  magVerwijderen?: boolean;
  /** Terugmeld-knop tonen? Bij een door kantoor ingeschoten klus die aan deze monteur is toegewezen. */
  magTerugmelden?: boolean;
  /** Oplevering vastgelegd maar nog niet naar de zaak verstuurd: toon "rapport niet verzonden". */
  rapportNietVerzonden?: boolean;
  /** Er zijn meer klussen op dezelfde referentie (vervolg-bezoek aan dezelfde keuken). */
  vervolg?: boolean;
}) {
  const titel = melding.klant_naam ?? "Onbekende klant";
  const opgeleverd = melding.opdracht_status === "opgeleverd";
  const aantalOpen = telling?.aantal ?? 0;
  const bevestig = opgeleverd ? null : bevestigBadgeConfig(melding.dashboard_status);
  const afStat = afrondStatus(melding);

  // Kleur-staat: gekleurde linker strip (8px) per staat. Rood=spoed, geel=rapport nog naar de zaak
  // versturen (opvallend van een afstand, los van de badge), oranje=open meldingen, groen=opgeleverd.
  const stripKleur = opgeleverd
    ? "border-l-success"
    : telling?.heeftSpoed
      ? "border-l-urgent-rood"
      : rapportNietVerzonden
        ? "border-l-urgent-geel"
        : aantalOpen > 0
          ? "border-l-accent"
          : "border-l-ink";

  return (
    <Link
      href={`/opdracht/${melding.id}`}
      className={`relative flex min-h-[72px] cursor-pointer items-center gap-3 border-2 border-ink border-l-[8px] ${stripKleur} bg-white p-4 pr-12 transition-colors duration-150 hover:brightness-[0.97] focus-visible:outline-3 focus-visible:outline-accent`}
    >
      {magVerwijderen && <OpdrachtVerwijderIcoon opdrachtId={melding.id} klantNaam={titel} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-lg font-extrabold tracking-tight text-ink">{titel}</span>
          {opgeleverd ? (
            <Badge config={opgeleverdBadgeConfig()} />
          ) : (
            telling?.heeftSpoed && (
              <Badge
                config={{ label: "Spoed", bg: "bg-urgent-rood", ink: "text-white", border: "border-urgent-rood", icon: "alert" }}
              />
            )
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {melding.teruggemeld_at && (
            <span className="inline-flex items-center gap-1.5 border-[1.5px] border-ink bg-ink px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
              Teruggemeld
            </span>
          )}
          {melding.heropend_at && (
            <span className="inline-flex items-center gap-1.5 border-[1.5px] border-accent bg-accent px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
              Heropend
            </span>
          )}
          {afStat && (
            <span
              className={`inline-flex items-center gap-1.5 border-[1.5px] px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white ${
                afStat === "vervolg-plannen" ? "border-accent bg-accent" : "border-success bg-success"
              }`}
            >
              {afrondStatusLabel(afStat)}
            </span>
          )}
          {bevestig && !afStat && <Badge config={bevestig} />}
          <DocumenttypeBadge type={melding.documenttype} />
          {melding.referentienummer && (
            <span className="bg-surface px-1.5 py-0.5 font-mono text-xs font-bold text-ink">
              {melding.referentienummer}
            </span>
          )}
          {vervolg && (
            <span className="inline-flex items-center border-[1.5px] border-ink-muted px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ink-muted">
              meerdere bezoeken
            </span>
          )}
          {!opgeleverd && aantalOpen > 0 && (
            <Badge
              config={{
                label: `${aantalOpen} open`,
                bg: "bg-white",
                ink: "text-accent",
                border: "border-accent",
                icon: "clock",
              }}
            />
          )}
          {!opgeleverd && rapportNietVerzonden && (
            <Badge
              config={{
                label: "Rapport niet verzonden",
                bg: "bg-urgent-geel/20",
                ink: "text-ink",
                border: "border-urgent-geel",
                icon: "alert",
              }}
            />
          )}
        </div>

        {melding.teruggemeld_at && melding.teruggemeld_reden && (
          <p className="mt-1 text-sm text-ink">
            Reden: <span className="font-semibold">{redenLabel(melding.teruggemeld_reden)}</span>
            {melding.teruggemeld_toelichting ? ` — ${melding.teruggemeld_toelichting}` : ""}
          </p>
        )}

        {melding.klant_adres && (
          <p className="mt-1 truncate text-sm text-ink-muted">{melding.klant_adres}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-mono font-bold text-ink">
            <CalendarClock size={15} strokeWidth={2.5} aria-hidden="true" />
            {(() => {
              const datum = uitvoerdatumVoorMonteur(melding);
              return datum ? formatDatumKort(datum) : "Nog niet gepland";
            })()}
          </span>
          {melding.leverweek && (
            <span className="inline-flex items-center gap-1 font-mono text-ink-muted">
              <Truck size={15} strokeWidth={2} aria-hidden="true" />
              wk {melding.leverweek}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-mono text-ink-muted">
            <CalendarPlus size={15} strokeWidth={2} aria-hidden="true" />
            {formatDatumKort(melding.created_at)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BevestigKaartKnop opdrachtId={melding.id} status={melding.dashboard_status} />
          {magTerugmelden && <TerugmeldKnop opdrachtId={melding.id} klantNaam={titel} />}
        </div>
      </div>

      <ChevronRight size={24} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}
