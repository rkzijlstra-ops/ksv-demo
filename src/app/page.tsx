import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { groepeerMeldingen } from "@/lib/werkpool";
import { OpdrachtCard } from "@/components/OpdrachtCard";
import { HistorySection } from "@/components/HistorySection";
import { OpdrachtAanmaken } from "@/components/OpdrachtAanmaken";
import { UserMenu } from "@/components/UserMenu";
import { PrefetchOpdrachten } from "@/components/PrefetchOpdrachten";
import { vereisRol } from "@/lib/toegang";

export const dynamic = "force-dynamic";

export default async function WerkpoolPage() {
  const { email, profiel } = await vereisRol(["monteur", "beheerder"]);

  const dbi = await db();
  // Oplever-werkpool = alleen je eigen toegewezen klussen (KSV-klussen aan jou + je eigen
  // zelf-ingeschoten klussen, bv. KKS). Het volledige overzicht staat op het dashboard.
  const meldingen = await dbi.getWerkpoolVoor(profiel.id);
  const tellingen = await dbi.getMeldingTellingen();
  const { actief, history } = groepeerMeldingen(meldingen);

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
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Opdrachten</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {actief.length} {actief.length === 1 ? "actieve klus" : "actieve klussen"}
            </p>
          </div>
          {email && <UserMenu email={email} isBeheerder={profiel.rol === "beheerder"} />}
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
      </header>

      <div className="mb-4">
        <OpdrachtAanmaken />
      </div>

      {actief.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-none border border-line bg-surface p-8 text-center">
          <Inbox size={40} className="text-ink-muted" aria-hidden="true" />
          <p className="font-semibold text-ink">Geen actieve klussen</p>
          <p className="text-sm text-ink-muted">
            Nieuwe opdrachten en meldingen verschijnen hier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actief.map((m) => (
            <OpdrachtCard key={m.id} melding={m} telling={tellingen[m.id]} />
          ))}
        </div>
      )}

      <HistorySection meldingen={history} />
    </main>
  );
}
