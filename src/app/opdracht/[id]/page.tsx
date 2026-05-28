import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CalendarClock, CalendarPlus, MapPin } from "lucide-react";
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
  const melding = await db().getMeldingById(id);
  if (!melding) notFound();

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
          {melding.klant_naam ?? "Onbekende klant"}
        </h1>
        <UrgentieBadge urgentie={melding.urgentie} />
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <BronBadge bron={melding.bron} />
        {melding.referentienummer && (
          <span className="text-sm font-semibold text-ink-muted">
            ref {melding.referentienummer}
          </span>
        )}
        {melding.adviseur && (
          <span className="text-sm text-ink-muted">adviseur {melding.adviseur}</span>
        )}
      </div>

      {melding.klant_adres && (
        <p className="mt-3 flex items-start gap-2 text-base text-ink">
          <MapPin size={20} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
          {melding.klant_adres}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-ink">
          <CalendarClock size={16} strokeWidth={2.5} aria-hidden="true" />
          Uitvoer:{" "}
          {melding.uitvoerdatum ? formatDatumKort(melding.uitvoerdatum) : "Nog niet gepland"}
        </span>
        <span className="inline-flex items-center gap-2 text-ink-muted">
          <CalendarPlus size={16} aria-hidden="true" />
          Aangemaakt: {formatDatumKort(melding.created_at)}
        </span>
      </div>

      {(melding.klant_adres || melding.klant_telefoon) && (
        <div className="mt-5 flex gap-3">
          {melding.klant_adres && <NavKnop adres={melding.klant_adres} />}
          <BelKnop telefoon={melding.klant_telefoon} />
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold text-ink">
          Meldingen ({melding.meldingen.length})
        </h2>
        {melding.meldingen.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen artikel-meldingen op deze opdracht.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {melding.meldingen.map((item, i) => (
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
        )}
      </section>

      {(melding.ruwe_tekst || melding.spraak_tekst) && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold text-ink">Toelichting monteur</h2>
          <p className="rounded-xl border border-line bg-white p-4 font-[family-name:var(--font-body)] text-base text-ink">
            {melding.ruwe_tekst ?? melding.spraak_tekst}
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold text-ink">Foto&apos;s</h2>
        <FotoGalerij urls={melding.foto_urls} />
      </section>
    </main>
  );
}
