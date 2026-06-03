import Link from "next/link";
import { FileText, Image as ImageIcon, ExternalLink, User, MapPin, Phone, FileCheck } from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { planningTijd, duurLabel } from "@/lib/opdracht-weergave";
import { OpdrachtStatusBadge } from "@/components/OpdrachtStatusBadge";
import { DocumenttypeBadge } from "@/components/DocumenttypeBadge";
import { TerugKnop } from "@/components/TerugKnop";

export const dynamic = "force-dynamic";

function Regel({ icon, label, waarde }: { icon: React.ReactNode; label: string; waarde: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-ink-muted">{icon}</span>
      <span className="w-28 shrink-0 text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1 font-semibold text-ink">{waarde}</span>
    </div>
  );
}

export default async function OpdrachtgeverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  const opdracht = await dbi.getOpdrachtById(id);

  if (!opdracht) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 pb-24">
        <TerugKnop href="/dashboard" label="Dashboard" />
        <p className="mt-6 text-sm text-ink-muted">Opdracht niet gevonden.</p>
      </main>
    );
  }

  const documenten = await dbi.getDocumentenVoorOpdracht(id);
  const meldingen = await dbi.getMeldingenVoorOpdracht(id);
  const planning =
    opdracht.startdatum && opdracht.starttijd === null
      ? `${planningTijd(opdracht)} · ${duurLabel(opdracht.duur_dagen)}`
      : planningTijd(opdracht);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <TerugKnop href="/dashboard" label="Dashboard" />

      <header className="relative mt-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">KSV / Opdracht</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DocumenttypeBadge type={opdracht.documenttype} />
          <OpdrachtStatusBadge status={opdracht.dashboard_status} />
          {opdracht.referentienummer && (
            <span className="bg-surface px-1.5 py-0.5 font-mono text-xs font-bold text-ink">
              {opdracht.referentienummer}
            </span>
          )}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {/* Gegevens */}
      <section className="border-2 border-t-0 border-line bg-white px-5 py-4">
        <div className="flex flex-col gap-2">
          {opdracht.klant_adres && (
            <Regel icon={<MapPin size={15} />} label="Adres" waarde={opdracht.klant_adres} />
          )}
          {opdracht.klant_telefoon && (
            <Regel icon={<Phone size={15} />} label="Telefoon" waarde={opdracht.klant_telefoon} />
          )}
          <Regel
            icon={<User size={15} />}
            label="Monteur"
            waarde={opdracht.monteur_naam ?? "Nog niet toegewezen"}
          />
          <Regel icon={<FileCheck size={15} />} label="Planning" waarde={planning} />
          {opdracht.opdracht_status === "opgeleverd" && (
            <Regel
              icon={<FileCheck size={15} />}
              label="Opgeleverd"
              waarde={formatDatumKort(opdracht.opgeleverd_at)}
            />
          )}
        </div>
      </section>

      {/* Opgeleverd rapport (voorlopig als link; volledige leesweergave volgt in blok 5) */}
      {opdracht.rapport_url && (
        <a
          href={opdracht.rapport_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 border-2 border-success bg-white px-4 py-2 text-sm font-extrabold uppercase tracking-[0.04em] text-success hover:bg-surface"
        >
          <FileText size={16} strokeWidth={2.4} aria-hidden="true" />
          Opleverrapport (PDF)
        </a>
      )}

      {/* Documenten */}
      <section className="mt-6">
        <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Documenten ({documenten.length})
        </h2>
        {documenten.length === 0 ? (
          <p className="text-sm text-ink-muted">Geen documenten bij deze opdracht.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documenten.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.publieke_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[52px] items-center gap-3 border border-line bg-white p-3 hover:opacity-80"
                >
                  {doc.type === "pdf" ? (
                    <FileText size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  ) : (
                    <ImageIcon size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {doc.bestandsnaam}
                  </span>
                  {doc.is_primair && (
                    <span className="shrink-0 bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      bron
                    </span>
                  )}
                  <ExternalLink size={16} className="shrink-0 text-primary" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Meldingen van de monteur (samenvatting; volledige weergave volgt in blok 5) */}
      {meldingen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
            Meldingen ({meldingen.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {meldingen.map((m) => (
              <li key={m.id} className="border border-line bg-white p-3 text-sm">
                <p className="text-ink">{m.ruwe_tekst ?? "(geen tekst)"}</p>
                {m.foto_urls.length > 0 && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {m.foto_urls.length} foto{m.foto_urls.length === 1 ? "" : "'s"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
