import Link from "next/link";
import {
  FileText,
  User,
  MapPin,
  Phone,
  FileCheck,
  Video,
  PenLine,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { planningTijd, duurLabel } from "@/lib/opdracht-weergave";
import { OpdrachtStatusBadge } from "@/components/OpdrachtStatusBadge";
import { DocumenttypeBadge } from "@/components/DocumenttypeBadge";
import { FotoGalerij } from "@/components/FotoGalerij";
import { TerugKnop } from "@/components/TerugKnop";
import { OpdrachtBewerken } from "@/components/OpdrachtBewerken";
import { DocumentBeheer } from "@/components/DocumentBeheer";
import { Logboek } from "@/components/Logboek";
import { AnnuleerKnop } from "@/components/AnnuleerKnop";
import { vereisRol } from "@/lib/toegang";
import { afrondStatus } from "@/lib/afrond-status";
import { AfgerondKeuren } from "@/components/AfgerondKeuren";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; week?: string }>;
}) {
  const { id } = await params;
  const { from, week } = await searchParams;
  await vereisRol(["opdrachtgever", "beheerder"]);

  // Terug naar waar je vandaan kwam: vanuit het planbord terug naar het planbord (zelfde week),
  // anders naar het dashboard. De context reist mee in de "eerder"-links zodat hij behouden blijft.
  const vanPlanbord = from === "planbord";
  const terugHref = vanPlanbord ? `/planbord${week ? `?week=${week}` : ""}` : "/dashboard";
  const terugLabel = vanPlanbord ? "Planbord" : "Dashboard";
  const ctxQuery = vanPlanbord ? `?from=planbord${week ? `&week=${week}` : ""}` : "";
  const dbi = await db();
  const opdracht = await dbi.getOpdrachtById(id);

  if (!opdracht) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 pb-24">
        <TerugKnop href={terugHref} label={terugLabel} />
        <p className="mt-6 text-sm text-ink-muted">Opdracht niet gevonden.</p>
      </main>
    );
  }

  // De rest van de gegevens hangt niet van elkaar af: tegelijk ophalen i.p.v. in een rij (sneller).
  const [documenten, meldingen, oplevering, verzendingen, gebeurtenissen, historieRuw] =
    await Promise.all([
      dbi.getDocumentenVoorOpdracht(id),
      dbi.getMeldingenVoorOpdracht(id),
      dbi.getOpleveringVoorOpdracht(id),
      dbi.getRapportVerzendingen(id),
      dbi.getGebeurtenissenVoor(id),
      opdracht.referentienummer ? dbi.zoekOpReferentie(opdracht.referentienummer) : Promise.resolve([]),
    ]);
  const historie = historieRuw.filter((h) => h.id !== opdracht.id);
  const planning =
    opdracht.startdatum && opdracht.starttijd === null
      ? `${planningTijd(opdracht)} · ${duurLabel(opdracht.duur_dagen)}`
      : planningTijd(opdracht);
  const afStat = afrondStatus(opdracht);

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <TerugKnop href={terugHref} label={terugLabel} />

      <header className="relative mt-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">Kluslus / Klus</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          {opdracht.klant_naam ?? "Onbekende klant"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <DocumenttypeBadge type={opdracht.documenttype} />
          <OpdrachtStatusBadge status={opdracht.dashboard_status} />
          {opdracht.teruggemeld_at && (
            <span className="inline-flex items-center gap-1.5 border-[1.5px] border-ink bg-ink px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
              Teruggemeld
            </span>
          )}
          {opdracht.referentienummer && (
            <span className="bg-surface px-1.5 py-0.5 font-mono text-xs font-bold text-ink">
              {opdracht.referentienummer}
            </span>
          )}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {afStat === "voltooid" && (
        <section className="mt-6 border-2 border-success bg-success/5 p-4">
          <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Door de monteur voltooid gemeld</h2>
          {opdracht.afgerond_toelichting && (
            <p className="mt-2 border border-line border-l-[3px] border-l-success bg-white px-3 py-2 text-base text-ink">
              {opdracht.afgerond_toelichting}
            </p>
          )}
          {opdracht.afgerond_foto_urls.length > 0 && (
            <div className="mt-3">
              <FotoGalerij urls={opdracht.afgerond_foto_urls} />
            </div>
          )}
          <AfgerondKeuren opdrachtId={opdracht.id} />
        </section>
      )}

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
        <OpdrachtBewerken
          id={opdracht.id}
          klant_naam={opdracht.klant_naam}
          klant_adres={opdracht.klant_adres}
          klant_telefoon={opdracht.klant_telefoon}
          referentienummer={opdracht.referentienummer}
          keukenzaak={opdracht.keukenzaak}
          documenttype={opdracht.documenttype ?? "onbekend"}
          startdatum={opdracht.startdatum}
          starttijd={opdracht.starttijd}
          duur_dagen={opdracht.duur_dagen}
        />
        <AnnuleerKnop
          opdrachtId={opdracht.id}
          status={opdracht.dashboard_status}
          opgeleverd={opdracht.opdracht_status === "opgeleverd"}
        />
      </section>

      {/* Opleverrapport als leesweergave. Pas tonen zodra de monteur de ZAAK-versie heeft verstuurd:
          het kantoor mag het oplevermoment niet eerder zien dan de monteur het deelt (privacy). */}
      {oplevering && oplevering.zaak_rapport_verzonden_at && (
        <section className="mt-6 border-2 border-success bg-white">
          <div className="flex items-center justify-between gap-2 border-b-2 border-success bg-success/10 px-4 py-2.5">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-success">
              Opleverrapport
            </h2>
            {(opdracht.rapport_url ?? oplevering.rapport_url) && (
              <a
                href={opdracht.rapport_url ?? oplevering.rapport_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.03em] text-success hover:underline"
              >
                <FileText size={14} strokeWidth={2.4} aria-hidden="true" /> PDF
              </a>
            )}
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
                Eindstaat ({oplevering.eindstaat_foto_urls.length} foto
                {oplevering.eindstaat_foto_urls.length === 1 ? "" : "'s"})
              </p>
              <FotoGalerij urls={oplevering.eindstaat_foto_urls} />
            </div>

            {oplevering.video_url && (
              <a
                href={oplevering.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Video size={16} strokeWidth={2.2} aria-hidden="true" /> Video van de oplevering
              </a>
            )}

            {oplevering.opmerking && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
                  Opmerking monteur
                </p>
                <p className="text-sm text-ink">{oplevering.opmerking}</p>
              </div>
            )}

            {oplevering.interne_opmerking && (
              <div className="border-2 border-urgent-geel bg-urgent-geel/10 p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.05em] text-ink">
                  Interne notitie · alleen voor de zaak
                </p>
                <p className="text-sm text-ink">{oplevering.interne_opmerking}</p>
              </div>
            )}

            {oplevering.handtekening_url && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
                  <PenLine size={13} aria-hidden="true" /> Handtekening
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oplevering.handtekening_url}
                  alt="Handtekening klant"
                  className="h-24 border border-line bg-white object-contain"
                />
              </div>
            )}

            {verzendingen.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
                  Verzonden
                </p>
                <ul className="flex flex-col gap-1">
                  {verzendingen.map((v) => (
                    <li key={v.id} className="flex items-start gap-2 text-sm text-ink">
                      <span
                        className={`mt-0.5 shrink-0 border px-1.5 text-xs font-bold uppercase tracking-[0.03em] ${
                          v.doelgroep === "zaak" ? "border-primary text-primary" : "border-ink-muted text-ink-muted"
                        }`}
                      >
                        {v.doelgroep}
                      </span>
                      <span className="min-w-0 flex-1 break-all">{v.naar}</span>
                      <span className="shrink-0 text-xs text-ink-muted">{formatDatumKort(v.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Documenten: openen, verwijderen, bijvoegen (kantoor) */}
      <DocumentBeheer opdrachtId={opdracht.id} documenten={documenten} />

      {/* Meldingen van de monteur, met foto's */}
      {meldingen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
            Meldingen ({meldingen.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {meldingen.map((m) => (
              <li key={m.id} className="border border-line bg-white p-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm text-ink">{m.ruwe_tekst ?? "(geen tekst)"}</p>
                  {m.spoed && (
                    <span className="inline-flex shrink-0 items-center gap-1 border-[1.5px] border-urgent-rood bg-urgent-rood px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] text-white">
                      <AlertTriangle size={13} strokeWidth={2.5} aria-hidden="true" /> Spoed
                    </span>
                  )}
                </div>
                {m.foto_urls.length > 0 && <FotoGalerij urls={m.foto_urls} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Keukenhistorie: eerdere klussen op dezelfde keuken (zelfde referentienummer) */}
      {historie.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
            Eerder op deze referentie ({historie.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {historie.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/dashboard/opdracht/${h.id}${ctxQuery}`}
                  className="flex items-center gap-3 border border-line bg-white p-3 hover:opacity-80"
                >
                  <span className="w-16 shrink-0 font-mono text-xs font-bold text-primary">
                    {formatDatumKort(h.opgeleverd_at ?? h.startdatum ?? h.created_at)}
                  </span>
                  <DocumenttypeBadge type={h.documenttype} />
                  <OpdrachtStatusBadge status={h.dashboard_status} />
                  {h.monteur_naam && (
                    <span className="truncate text-sm text-ink-muted">{h.monteur_naam}</span>
                  )}
                  <ChevronRight size={18} className="ml-auto shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Logboek gebeurtenissen={gebeurtenissen} />
    </main>
  );
}
