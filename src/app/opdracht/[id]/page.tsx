import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CalendarClock,
  CalendarPlus,
  MapPin,
  Plus,
  Check,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { UrgentieBadge } from "@/components/UrgentieBadge";
import { BronBadge } from "@/components/BronBadge";
import { NavKnop } from "@/components/NavKnop";
import { BelKnop } from "@/components/BelKnop";
import { FotoGalerij } from "@/components/FotoGalerij";

export const dynamic = "force-dynamic";

export default async function OpdrachtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opdracht = await db().getMeldingById(id);
  if (!opdracht) notFound();
  const meldingen = await db().getMeldingenVoorOpdracht(id);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Werkbak
      </Link>

      <header className="mt-2 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <UrgentieBadge urgentie={opdracht.urgentie} />
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <BronBadge bron={opdracht.bron} />
        {opdracht.referentienummer && (
          <span className="text-sm font-semibold text-ink-muted">
            ref {opdracht.referentienummer}
          </span>
        )}
        {opdracht.adviseur && (
          <span className="text-sm text-ink-muted">adviseur {opdracht.adviseur}</span>
        )}
      </div>

      {opdracht.klant_adres && (
        <p className="mt-3 flex items-start gap-2 text-base text-ink">
          <MapPin size={20} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {opdracht.klant_adres}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-ink">
          <CalendarClock size={16} strokeWidth={2.5} aria-hidden="true" />
          Uitvoer:{" "}
          {opdracht.uitvoerdatum ? formatDatumKort(opdracht.uitvoerdatum) : "Nog niet gepland"}
        </span>
        <span className="inline-flex items-center gap-2 text-ink-muted">
          <CalendarPlus size={16} aria-hidden="true" />
          Aangemaakt: {formatDatumKort(opdracht.created_at)}
        </span>
      </div>

      {(opdracht.klant_adres || opdracht.klant_telefoon) && (
        <div className="mt-5 flex gap-3">
          {opdracht.klant_adres && <NavKnop adres={opdracht.klant_adres} />}
          <BelKnop telefoon={opdracht.klant_telefoon} />
        </div>
      )}

      {opdracht.meldingen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold text-ink">Artikelen uit opdracht</h2>
          <ul className="flex flex-col gap-3">
            {opdracht.meldingen.map((item, i) => (
              <li key={i} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-bold text-ink">{item.omschrijving}</span>
                  <span className="font-mono text-xs text-ink-muted">{item.keller_code}</span>
                </div>
                <p className="mt-1 font-[family-name:var(--font-body)] text-base text-ink">
                  {item.melding_tekst}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Meldingen ({meldingen.length})</h2>
        </div>

        <Link
          href={`/opdracht/${id}/melding`}
          className="mb-3 flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary"
        >
          <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
          Melding toevoegen
        </Link>

        {meldingen.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
            Nog geen meldingen op deze opdracht. Maak er een met de knop hierboven.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {meldingen.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <UrgentieBadge urgentie={m.urgentie} />
                  {m.status === "verzonden" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                      <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                      Verzonden{m.aangepast ? " (aangepast)" : ""}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-ink-muted">Concept</span>
                  )}
                </div>

                {m.ruwe_tekst && (
                  <p className="mt-2 font-[family-name:var(--font-body)] text-base text-ink">
                    {m.ruwe_tekst}
                  </p>
                )}

                {m.foto_urls.length > 0 && (
                  <div className="mt-3">
                    <FotoGalerij urls={m.foto_urls} />
                  </div>
                )}

                <p className="mt-2 text-xs text-ink-muted">
                  {formatDatumKort(m.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
