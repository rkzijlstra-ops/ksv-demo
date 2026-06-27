import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CalendarPlus,
  Truck,
  MapPin,
  Plus,
  PackageCheck,
  ClipboardCheck,
  FileBarChart,
  ChevronLeft,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatDatumKort } from "@/lib/datum";
import { domeinVanAdres, isEersteContactMetDomein } from "@/lib/verzend-domein";
import { VerzendInfoBlok } from "@/components/VerzendInfoBlok";
import { uitvoerdatumVoorMonteur } from "@/lib/opdracht-status";
import { ActieKaart } from "@/components/ActieKaart";
import { DocumenttypeBadge } from "@/components/DocumenttypeBadge";
import { DocumentToevoegen } from "@/components/DocumentToevoegen";
import { DocumentenBlok } from "@/components/DocumentenBlok";
import { MeldingRegel } from "@/components/MeldingRegel";
import { NavKnop } from "@/components/NavKnop";
import { BelKnop } from "@/components/BelKnop";
import { WhatsAppKnop } from "@/components/WhatsAppKnop";
import { PendingMeldingen } from "@/components/PendingMeldingen";
import { BevestigOntvangstKnop } from "@/components/BevestigOntvangstKnop";
import { WerkomschrijvingBlok } from "@/components/WerkomschrijvingBlok";

export const dynamic = "force-dynamic";

export default async function OpdrachtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dbi = await db();
  // Onafhankelijke gegevens tegelijk ophalen i.p.v. in een rij (sneller).
  const [opdracht, meldingen, documenten, verzendingen] = await Promise.all([
    dbi.getMeldingById(id),
    dbi.getMeldingenVoorOpdracht(id),
    dbi.getDocumentenVoorOpdracht(id),
    dbi.getRapportVerzendingen(id),
  ]);
  if (!opdracht) notFound();
  const opgeleverd = opdracht.opdracht_status === "opgeleverd";

  // Rondes: na heropenen begint een nieuwe ronde. Wat vóór het laatste heropen-moment is gemaakt, hoort
  // bij de vorige ronde (alleen-lezen ter referentie); daarna bij de huidige ronde.
  const heropendOp = opdracht.heropend_at;
  const huidigeMeldingen = heropendOp ? meldingen.filter((m) => m.created_at >= heropendOp) : meldingen;
  const vorigeMeldingen = heropendOp ? meldingen.filter((m) => m.created_at < heropendOp) : [];
  const huidigeVerzendingen = heropendOp
    ? verzendingen.filter((v) => v.created_at >= heropendOp)
    : verzendingen;
  const vorigeRapporten = heropendOp
    ? verzendingen.filter((v) => v.created_at < heropendOp && v.rapport_url)
    : [];

  // Eerste-contact-met-domein voor de spam-waarschuwing op het verzendblok (alleen de huidige ronde).
  const laatsteZaakVerz = huidigeVerzendingen.find((v) => v.doelgroep === "zaak") ?? huidigeVerzendingen[0];
  const verzDomein = laatsteZaakVerz ? domeinVanAdres(laatsteZaakVerz.naar) : null;
  const verzNaarDomein = verzDomein ? await dbi.eerdereVerzendingenNaarDomein(verzDomein) : [];
  const eersteContact = isEersteContactMetDomein(opdracht.id, verzNaarDomein);

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

      {/* "Oplevering verstuurd" + opnieuw versturen: alleen voor een in DEZE ronde opgeleverde klus. Op
          een open (heropende) klus zijn de vorige rapporten alleen-lezen, zie "Vorige ronde" onderaan. */}
      {opgeleverd && huidigeVerzendingen.length > 0 && (
        <VerzendInfoBlok
          opdrachtId={opdracht.id}
          verzendingen={huidigeVerzendingen.map((v) => ({
            id: v.id,
            created_at: v.created_at,
            doelgroep: v.doelgroep,
            naar: v.naar,
          }))}
          eersteKeer={eersteContact}
          klantNaam={opdracht.klant_naam}
          referentienummer={opdracht.referentienummer}
        />
      )}

      <WerkomschrijvingBlok opdrachtId={id} initieel={opdracht.werkomschrijving} />

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Documenten ({documenten.length})</h2>
          <DocumentToevoegen opdrachtId={id} />
        </div>
        <DocumentenBlok documenten={documenten} magOffline />
      </section>

      {opdracht.meldingen.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Artikelen uit klus</h2>
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
        <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Meldingen tijdens de klus</h2>
        <p className="mb-3 mt-1 text-sm text-ink-muted">Is iets beschadigd of manco? Meld het hier.</p>

        <Link
          href={`/opdracht/${id}/melding`}
          className="relative mb-3 flex min-h-[56px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
          Beschadiging of manco melden
        </Link>

        <PendingMeldingen opdrachtId={id} />

        {huidigeMeldingen.length === 0 ? (
          <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
            Nog geen meldingen op deze klus. Maak er een met de knop hierboven.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {huidigeMeldingen.map((m) => (
              <li key={m.id}>
                <MeldingRegel melding={m} opdrachtId={id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vorige ronde (na heropenen): de eerder gemelde punten + het vorige rapport, alleen-lezen ter
          referentie. Standaard dichtgeklapt zodat de pagina rustig blijft. */}
      {(vorigeMeldingen.length > 0 || vorigeRapporten.length > 0) && (
        <section className="mt-6">
          <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Vorige ronde</h2>
          <p className="mb-3 mt-1 text-sm text-ink-muted">Wat er eerder gebeurde, ter referentie. Alleen-lezen.</p>
          <ul className="flex flex-col gap-2">
            {vorigeMeldingen.map((m) => (
              <li key={m.id}>
                <MeldingRegel melding={m} opdrachtId={id} readOnly />
              </li>
            ))}
            {vorigeRapporten.map((v) => (
              <li key={v.id}>
                <a
                  href={v.rapport_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border border-line bg-white p-3 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
                >
                  <FileBarChart size={16} strokeWidth={2.2} className="shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">Vorig rapport bekijken</span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">{formatDatumKort(v.created_at)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Aan het einde van de klus: afsluiten als gelabeld blok in de pagina, zodat de pagina van boven
          naar onder het verhaal vertelt (tijdens de klus melden, aan het eind afsluiten). */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">Aan het einde van de klus</h2>
        <p className="mb-3 mt-1 text-sm text-ink-muted">Klus klaar? Sluit hem af en maak het rapport.</p>
        <ActieKaart
          href={`/opdracht/${id}/afronden`}
          accent="actie"
          subAccent
          icoon={<ClipboardCheck size={22} strokeWidth={2.5} aria-hidden="true" />}
          titel="Klus afsluiten"
          sub="Daarna kies je: snel of volledig opleveren."
        />
      </section>

      {/* Vaste onderbalk: alleen terug naar de kluspool (afsluiten staat nu als blok in de pagina). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            Terug naar kluspool
          </Link>
        </div>
      </div>
    </main>
  );
}
