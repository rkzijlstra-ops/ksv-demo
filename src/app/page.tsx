import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { groepeerMeldingen } from "@/lib/werkbak";
import { OpdrachtCard } from "@/components/OpdrachtCard";
import { HistorySection } from "@/components/HistorySection";
import { OpdrachtAanmaken } from "@/components/OpdrachtAanmaken";
import { UserMenu } from "@/components/UserMenu";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function WerkbakPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const dbi = await db();
  const meldingen = await dbi.getMeldingen();
  const tellingen = await dbi.getMeldingTellingen();
  const { actief, history } = groepeerMeldingen(meldingen);

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <header className="relative mb-4 bg-primary px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">
              KSV / Werkbak
            </p>
            <h1 className="mt-1 font-mono text-3xl font-extrabold tracking-tight">Opdrachten</h1>
            <p className="mt-1 text-sm text-white/85">
              {actief.length} {actief.length === 1 ? "actieve klus" : "actieve klussen"}
            </p>
          </div>
          {user?.email && <UserMenu email={user.email} />}
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
