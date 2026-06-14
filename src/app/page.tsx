import Link from "next/link";
import { Inbox, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { groepeerMeldingen } from "@/lib/werkpool";
import { OpdrachtCard } from "@/components/OpdrachtCard";
import { HistorySection } from "@/components/HistorySection";
import { KlusInvoer } from "@/components/KlusInvoer";
import { WerkpoolOnboarding } from "@/components/WerkpoolOnboarding";
import { UserMenu } from "@/components/UserMenu";
import { PrefetchOpdrachten } from "@/components/PrefetchOpdrachten";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

export default async function WerkpoolPage() {
  const { email, profiel } = await vereisRol(["monteur", "beheerder"]);

  const dbi = await db();
  // Oplever-werkpool = alleen je eigen toegewezen klussen (KSV-klussen aan jou + je eigen
  // zelf-ingeschoten klussen, bv. KKS). Het volledige overzicht staat op het dashboard.
  const [meldingen, tellingen, inbox] = await Promise.all([
    dbi.getWerkpoolVoor(profiel.id),
    dbi.getMeldingTellingen(),
    dbi.getInboxVoor(profiel.id),
  ]);
  const { actief, history } = groepeerMeldingen(meldingen);

  // Welke actieve klussen wachten nog op verzending naar de zaak (oplevering vastgelegd, niet verstuurd).
  const nietVerzonden = new Set(
    await dbi.getOpdrachtenRapportNietVerzonden(actief.map((m) => m.id)),
  );

  const prefetchIds = [...actief.map((m) => m.id), ...history.map((m) => m.id)];

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <PrefetchOpdrachten ids={prefetchIds} />
      <header className="relative mb-4 border-2 border-b-0 border-line bg-white px-5 py-5 text-ink">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              Werkpool
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

      <div className="mb-4">
        <KlusInvoer context="monteur" />
      </div>

      <WerkpoolOnboarding leeg={actief.length === 0} />

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
            />
          ))}
        </div>
      )}

      <HistorySection meldingen={history} />
    </main>
  );
}
