import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CalendarPlus,
  Truck,
  MapPin,
  Plus,
  Pencil,
  PackageCheck,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { uitvoerdatumVoorMonteur } from "@/lib/opdracht-status";
import { MeldingStaatBadge } from "@/components/MeldingStaatBadge";
import { DocumenttypeBadge } from "@/components/DocumenttypeBadge";
import { DocumentToevoegen } from "@/components/DocumentToevoegen";
import { DocumentRij } from "@/components/DocumentRij";
import { MeldingVerwijderKnop } from "@/components/MeldingVerwijderKnop";
import { NavKnop } from "@/components/NavKnop";
import { BelKnop } from "@/components/BelKnop";
import { WhatsAppKnop } from "@/components/WhatsAppKnop";
import { FotoGalerij } from "@/components/FotoGalerij";
import { PendingMeldingen } from "@/components/PendingMeldingen";
import { BevestigOntvangstKnop } from "@/components/BevestigOntvangstKnop";

export const dynamic = "force-dynamic";

export default async function OpdrachtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  // Onafhankelijke gegevens tegelijk ophalen i.p.v. in een rij (sneller).
  const [opdracht, meldingen, documenten] = await Promise.all([
    dbi.getMeldingById(id),
    dbi.getMeldingenVoorOpdracht(id),
    dbi.getDocumentenVoorOpdracht(id),
  ]);
  if (!opdracht) notFound();
  const opgeleverd = opdracht.opdracht_status === "opgeleverd";

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28">
      <header className="relative border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          {opdracht.keukenzaak ? `${opdracht.keukenzaak} / ` : ""}
          {opgeleverd ? "Opgeleverd" : "Meldingen"}
        </p>
        <h1 className="mt-1 font-mono text-2xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-1.5 ${opgeleverd ? "bg-success" : "bg-accent"}`}
        />
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <DocumenttypeBadge type={opdracht.documenttype} />
        {opdracht.referentienummer && (
          <span className="text-sm font-semibold text-ink-muted">ref {opdracht.referentienummer}</span>
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
          {(() => {
            const datum = uitvoerdatumVoorMonteur(opdracht);
            return datum ? formatDatumKort(datum) : "Nog niet gepland";
          })()}
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

      <BevestigOntvangstKnop opdrachtId={id} status={opdracht.dashboard_status} />

      {(opdracht.klant_adres || opdracht.klant_telefoon) && (
        <div className="mt-5 flex gap-3">
          {opdracht.klant_adres && <NavKnop adres={opdracht.klant_adres} />}
          <BelKnop telefoon={opdracht.klant_telefoon} />
          <WhatsAppKnop telefoon={opdracht.klant_telefoon} />
        </div>
      )}

      {opgeleverd && (
        <div className="mt-4 flex flex-col gap-2 rounded-none border border-success bg-success/10 p-3">
          <p className="flex items-center gap-2 font-bold text-success">
            <PackageCheck size={20} strokeWidth={2.5} aria-hidden="true" />
            Opgeleverd op {formatDatumKort(opdracht.opgeleverd_at)}
          </p>
          {opdracht.rapport_url && (
            <a
              href={opdracht.rapport_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 border-2 border-success bg-white px-4 text-sm font-extrabold uppercase tracking-[0.05em] text-success hover:bg-success/10 focus-visible:outline-3 focus-visible:outline-accent"
            >
              <FileBarChart size={18} strokeWidth={2.5} aria-hidden="true" />
              Rapport-PDF openen
            </a>
          )}
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Documenten ({documenten.length})</h2>
          <DocumentToevoegen opdrachtId={id} />
        </div>
        {documenten.length === 0 ? (
          <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
            Geen documenten bij deze opdracht. Voeg een PDF of foto toe met de knop hierboven.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documenten.map((doc) => (
              <DocumentRij key={doc.id} doc={doc} />
            ))}
          </ul>
        )}
      </section>

      {opdracht.meldingen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Artikelen uit opdracht</h2>
          <ul className="flex flex-col gap-3">
            {opdracht.meldingen.map((item, i) => (
              <li key={i} className="rounded-none border border-line bg-white p-4">
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
        <h2 className="mb-3 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Meldingen ({meldingen.length})</h2>

        <Link
          href={`/opdracht/${id}/melding`}
          className="relative mb-3 flex min-h-[56px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
          Melding toevoegen
        </Link>

        <PendingMeldingen opdrachtId={id} />

        {meldingen.length === 0 ? (
          <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
            Nog geen meldingen op deze opdracht. Maak er een met de knop hierboven.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {meldingen.map((m) => (
              <li key={m.id} className="rounded-none border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <MeldingStaatBadge spoed={m.spoed} spoed_verzonden_at={m.spoed_verzonden_at} />
                  {m.versie > 1 && (
                    <span className="text-sm font-semibold text-ink-muted">aangepast (v{m.versie})</span>
                  )}
                </div>
                {m.spoed && m.spoed_verzonden_at && (
                  <p className="mt-1 text-xs font-semibold text-urgent-rood">
                    Spoed verstuurd op {formatDatumKort(m.spoed_verzonden_at)}
                  </p>
                )}
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
                  <span className="font-mono text-xs text-ink-muted">{formatDatumKort(m.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/opdracht/${id}/melding/${m.id}`}
                      className="inline-flex min-h-[40px] cursor-pointer items-center gap-1 border border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
                    >
                      <Pencil size={15} strokeWidth={2.5} aria-hidden="true" />
                      Bewerken
                    </Link>
                    <MeldingVerwijderKnop meldingId={m.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vaste onderbalk: navigatie tussen de pagina's */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            Werkpool
          </Link>
          <Link
            href={`/opdracht/${id}/afronden`}
            className="relative inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
          >
            Klus afronden
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
