import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, ChevronRight, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { groepeerMeldingen } from "@/lib/kluspool";
import { OpdrachtCard } from "@/components/OpdrachtCard";
import { HistorySection } from "@/components/HistorySection";
import { KlusInvoer } from "@/components/KlusInvoer";
import { KluspoolOnboarding } from "@/components/KluspoolOnboarding";
import { UserMenu } from "@/components/UserMenu";
import { PrefetchOpdrachten } from "@/components/PrefetchOpdrachten";
import { DemoAutoRefresh } from "@/components/DemoAutoRefresh";
import { vereisRol } from "@/lib/toegang";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function KluspoolPage({
  searchParams,
}: {
  searchParams: Promise<{ kluspool?: string; werkpool?: string }>;
}) {
  const { email, profiel } = await vereisRol(["monteur", "beheerder"]);

  // Een beheerder is dubbelrol (mag kluspool én dashboard). Standaard sturen we 'm naar het dashboard,
  // zijn echte thuis. Wil hij tóch zijn eigen kluspool zien, dan komt hij hier via ?kluspool=1
  // (link in het accountmenu). Legacy ?werkpool=1 blijft werken voor oude links/bookmarks.
  // Een monteur en het param-geval renderen gewoon de kluspool hieronder.
  const sp = await searchParams;
  const kluspoolParam = sp?.kluspool === "1" || sp?.werkpool === "1";
  if (profiel.rol === "beheerder" && !kluspoolParam) {
    redirect("/dashboard");
  }

  const dbi = await db();
  // Oplever-kluspool = alleen je eigen toegewezen klussen (KSV-klussen aan jou + je eigen
  // zelf-ingeschoten klussen, bv. KKS). Het volledige overzicht staat op het dashboard.
  const [meldingen, tellingen, inbox, pogingen] = await Promise.all([
    dbi.getKluspoolVoor(profiel.id),
    dbi.getMeldingTellingen(),
    dbi.getInboxVoor(profiel.id),
    dbi.getTerugmeldPogingenVoor(profiel.id),
  ]);
  const { actief, history } = groepeerMeldingen(meldingen);

  // Blijvende terugmeld-historie (blok 22): klussen die ik terugmeldde maar die kantoor daarna aan een
  // andere monteur gaf, staan niet meer in mijn kluspool. Toon die pogingen read-only in mijn
  // geschiedenis, zodat "ik heb deze klus teruggemeld" een feit blijft, los van wie hem nu heeft.
  // Dedupe: pogingen voor een klus die nog wél in mijn kluspool staat (live kaart toont 'm al) overslaan.
  const getoondeIds = new Set([...actief, ...history].map((m) => m.id));
  const gezienePogingen = new Set<string>();
  const verweesdePogingen = pogingen.filter((p) => {
    if (getoondeIds.has(p.opdracht_id) || gezienePogingen.has(p.opdracht_id)) return false;
    gezienePogingen.add(p.opdracht_id);
    return true;
  });

  // Welke actieve klussen wachten nog op verzending naar de zaak (oplevering vastgelegd, niet verstuurd).
  const nietVerzonden = new Set(
    await dbi.getOpdrachtenRapportNietVerzonden(actief.map((m) => m.id)),
  );

  // Referentienummers die op meer dan één van mijn klussen voorkomen: vervolg-bezoeken aan dezelfde
  // keuken. Die kaarten krijgen een "meerdere bezoeken"-hint (de historie staat op de detailpagina).
  const refTelling = new Map<string, number>();
  for (const m of meldingen) {
    if (m.referentienummer) refTelling.set(m.referentienummer, (refTelling.get(m.referentienummer) ?? 0) + 1);
  }
  const heeftVervolg = (ref: string | null) => !!ref && (refTelling.get(ref) ?? 0) > 1;

  const prefetchIds = [...actief.map((m) => m.id), ...history.map((m) => m.id)];

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      {isDemoMode() && <DemoAutoRefresh />}
      <PrefetchOpdrachten ids={prefetchIds} />
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              Kluspool
            </p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Klussen</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {actief.length} {actief.length === 1 ? "actieve klus" : "actieve klussen"}
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      {inbox.length > 0 && (
        <Link
          href="/inbox"
          className="mb-4 flex items-center gap-3 border-2 border-ink bg-accent/20 px-4 py-3 text-ink transition-colors hover:bg-accent/30 focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Inbox size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-extrabold">
            {inbox.length} {inbox.length === 1 ? "klus" : "klussen"} te verwerken uit je mail
          </span>
          <ChevronRight size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
        </Link>
      )}

      {nietVerzonden.size > 0 && (
        <div className="mb-4 flex items-center gap-3 border-2 border-urgent-geel bg-urgent-geel/20 px-4 py-3 text-ink">
          <AlertTriangle size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-extrabold">
            {nietVerzonden.size} {nietVerzonden.size === 1 ? "klus" : "klussen"}: rapport nog naar de zaak versturen
          </span>
        </div>
      )}

      <div className="mb-4">
        <KlusInvoer context="monteur" />
      </div>

      <KluspoolOnboarding leeg={actief.length === 0} />

      {actief.length > 0 && (
        <div className="flex flex-col gap-3">
          {actief.map((m) => (
            <OpdrachtCard
              key={m.id}
              melding={m}
              telling={tellingen[m.id]}
              magVerwijderen={profiel.rol === "beheerder" || m.user_id === profiel.id}
              magTerugmelden={
                profiel.rol === "monteur" && m.user_id !== profiel.id && m.toegewezen_aan === profiel.id
              }
              rapportNietVerzonden={nietVerzonden.has(m.id)}
              vervolg={heeftVervolg(m.referentienummer)}
            />
          ))}
        </div>
      )}

      <HistorySection meldingen={history} pogingen={verweesdePogingen} />
    </main>
  );
}
