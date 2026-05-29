import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { FotoGalerij } from "@/components/FotoGalerij";

export const dynamic = "force-dynamic";

export default async function RapportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opdracht = await db().getMeldingById(id);
  if (!opdracht) notFound();
  const meldingen = await db().getMeldingenVoorOpdracht(id);

  const opleverdatum = opdracht.opgeleverd_at ?? new Date().toISOString();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <Link
        href={`/opdracht/${id}`}
        className="inline-flex min-h-[44px] items-center gap-1 text-base font-semibold text-primary hover:underline"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        Terug naar opdracht
      </Link>

      <header className="mt-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <PackageCheck size={26} strokeWidth={2.5} aria-hidden="true" />
          Opleverrapport
        </h1>
        <p className="text-sm text-ink-muted">Keukenstudio Voorschoten</p>
      </header>

      <section className="mt-4 rounded-xl border border-line bg-surface p-4">
        <p className="text-lg font-bold text-ink">{opdracht.klant_naam ?? "Onbekende klant"}</p>
        {opdracht.klant_adres && <p className="text-base text-ink">{opdracht.klant_adres}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          {opdracht.referentienummer && (
            <span className="font-semibold text-ink">ref {opdracht.referentienummer}</span>
          )}
          {opdracht.leverweek && <span>leverweek {opdracht.leverweek}</span>}
          <span>opgeleverd {formatDatumKort(opleverdatum)}</span>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-ink">Meldingen ({meldingen.length})</h2>
        {meldingen.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen meldingen op deze opdracht.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {meldingen.map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
                  <span className="text-xs text-ink-muted">{formatDatumKort(m.created_at)}</span>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
