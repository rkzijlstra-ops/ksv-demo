import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CalendarClock,
  CalendarPlus,
  Truck,
  MapPin,
  Plus,
  Check,
  Pencil,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  PackageCheck,
  FileBarChart,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { UrgentieBadge } from "@/components/UrgentieBadge";
import { DocumenttypeBadge } from "@/components/DocumenttypeBadge";
import { DocumentToevoegen } from "@/components/DocumentToevoegen";
import { OpleverKnop } from "@/components/OpleverKnop";
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
  const documenten = await db().getDocumentenVoorOpdracht(id);

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
        <DocumenttypeBadge type={opdracht.documenttype} />
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
        {opdracht.leverweek && (
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <Truck size={16} strokeWidth={2.5} aria-hidden="true" />
            Leverweek: {opdracht.leverweek}
          </span>
        )}
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

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">Documenten ({documenten.length})</h2>
          <DocumentToevoegen opdrachtId={id} />
        </div>
        {documenten.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen documenten bij deze opdracht. Voeg een PDF of foto toe met de knop hierboven.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documenten.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.publieke_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
                >
                  {doc.type === "pdf" ? (
                    <FileText size={22} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  ) : (
                    <ImageIcon size={22} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {doc.bestandsnaam}
                  </span>
                  {doc.is_primair && (
                    <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      bron
                    </span>
                  )}
                  <ExternalLink size={18} className="shrink-0 text-primary" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                      Verzonden{m.versie > 1 ? ` · aangepast (v${m.versie})` : ""}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-ink-muted">
                      Concept{m.versie > 1 ? ` · v${m.versie}` : ""}
                    </span>
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

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-muted">{formatDatumKort(m.created_at)}</span>
                  <Link
                    href={`/opdracht/${id}/melding/${m.id}`}
                    className="inline-flex min-h-[40px] cursor-pointer items-center gap-1 rounded-lg border border-line px-3 text-sm font-semibold text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
                  >
                    <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
                    Bewerken
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 border-t border-line pt-6">
        {opdracht.opdracht_status === "opgeleverd" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-success bg-success/10 p-4">
            <p className="flex items-center gap-2 font-bold text-success">
              <PackageCheck size={20} strokeWidth={2.5} aria-hidden="true" />
              Opgeleverd op {formatDatumKort(opdracht.opgeleverd_at)}
            </p>
            {opdracht.rapport_url && (
              <a
                href={opdracht.rapport_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-base font-semibold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
              >
                <FileBarChart size={20} strokeWidth={2.5} aria-hidden="true" />
                Rapport-PDF openen
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <OpleverKnop opdrachtId={id} meldingCount={meldingen.length} />
            <Link
              href={`/opdracht/${id}/rapport`}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary"
            >
              <FileBarChart size={18} strokeWidth={2.5} aria-hidden="true" />
              Rapport voorvertonen
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
